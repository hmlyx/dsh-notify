/**
 * dsh-notify — 提醒泡泡静态 profile 插件（host 半）
 *
 * 与 beauticode-dsh / dshmarket / dsh-memory 同构的静态插件：
 *  - webServer 挂 /__notify/* HTTP 接口（client 半 fetch 调用）
 *  - tools.register 注册 notify_push 工具（全局，任何预设可用）
 *  - systemPrompt.context 注入 AI 总结指引
 *  - 队列：AI/插件推送 → host 内存队列 → client 轮询拉取
 *
 * 生命周期与进程一致：装上即永久生效，重启不消失，无需审批。
 *
 * ══════════════════════════════════════════════════════════════
 * 接口与功能目录（写给其他 AI：改这里前先看本目录，改完同步更新）
 * ══════════════════════════════════════════════════════════════
 * ── HTTP 接口（webServer.register，全部 /__notify/*）──
 *   POST /__notify/push        {text,link?,source?}     推送提醒入队，返回 {ok,id}
 *   GET  /__notify/poll                                  取走队列（client 每 1.2s 轮询）
 *   POST /__notify/set-ai-summary {sessionId,enabled}    AI 总结开关（影响 systemPrompt）
 *   GET  /__notify/asset?name=                           插件内置素材（assets/，防目录穿越）
 *   GET  /__notify/file?path=                            自定义本地图片（读任意路径，校验扩展名）
 *   GET  /__notify/user-image?name=                      用户导入素材（.dsh-notify-data/images/）
 *   POST /__notify/import-image {dataUrl,category}       导入素材并持久化（sha256 去重）
 *   GET  /__notify/history                               历史素材列表 {bubbleBg,windowBg,windowBorder}
 *   POST /__notify/history/delete {name,category}        删除历史素材（连带删文件）
 *   GET  /__notify/presets · POST /__notify/presets/save · presets/rename · presets/delete
 *                                                        自定义预设（磁盘 presets.json，可改名）
 *   GET  /__notify/random-pool · POST /__notify/random-pool/save
 *                                                        随机装扮池（{enabled,presetNames}，从预设随机）
 *   （注：重启窗口接口 /__notify/restart-app 已拆到独立插件 dsh-restart）
 * ── 注册的对外能力 ──
 *   工具 notify_push（任何预设/AI 可用，systemPrompt 有使用指引）
 *   systemPrompt 注入「AI 总结」指引（aiSummaryBySession 按会话开关）
 * ── 数据位置 ──
 *   DATA_DIR = ~/.dsh/profiles/web/.dsh-notify-data/（images/ 存素材，history.json/presets.json/random-pool.json）
 *   ASSETS_DIR = 插件包内 assets/（内置预设素材）
 * ── 常量/配置 ──
 *   MAX_BODY_BYTES=4MB（图片导入上限）、IMAGE_EXT 允许扩展名、category 三分类
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

export const name = 'dsh-notify'
export const inject = ['webServer']

const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4MB：允许大图
// 插件 assets 目录：从 DSH_HOME 推导（import.meta.url 在源码模式下会解析错误）
const DSH_HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE || '.', '.dsh')
const ASSETS_DIR = path.join(DSH_HOME, 'profiles', 'web', 'node_modules', 'dsh-notify', 'assets')
// 用户数据目录（持久化素材，重启不丢，插件更新不受影响）
const DATA_DIR = path.join(DSH_HOME, 'profiles', 'web', '.dsh-notify-data')
const IMAGES_DIR = path.join(DATA_DIR, 'images')
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
// 自定义预设（泡泡外观全套，可改名）与随机装扮池（磁盘持久化）
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json')
const RANDOM_POOL_FILE = path.join(DATA_DIR, 'random-pool.json')
// 允许读取的图片扩展名
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'])

export function apply(ctx, config = {}) {
  const queue = []
  let seq = 0
  const aiSummaryBySession = new Map()

  /* ---------------- HTTP 工具函数 ---------------- */

  function sendJson(res, status, body) {
    const encoded = JSON.stringify(body)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(encoded),
    })
    res.end(encoded)
  }
  function readJson(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
          const error = new Error('请求内容过大。')
          error.statusCode = 413
          reject(error)
          req.removeAllListeners('data')
          req.resume()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            const error = new Error('请求内容必须是 JSON 对象。')
            error.statusCode = 400
            reject(error)
            return
          }
          resolve(parsed)
        } catch (error) {
          error.statusCode = 400
          reject(error)
        }
      })
      req.on('error', reject)
    })
  }

  const makeItem = (text, link, source) => ({
    id: 'h' + (++seq),
    text: String(text || ''),
    link: link ? String(link) : '',
    source: source ? String(source) : '',
    ts: Date.now(),
  })

  /* ---------------- 素材持久化辅助 ---------------- */

  async function readHistory() {
    try {
      const raw = await readFile(HISTORY_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* 回退默认 */ }
    return { bubbleBg: [], bubbleBorder: [], windowBg: [], windowBorder: [] }
  }
  async function writeHistory(history) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8')
  }
  // 保存一张导入的图片：dataURL/base64 → 磁盘文件；返回文件名
  // 相同内容的图（按内容哈希）在同一分类里只保留一份，重复导入直接复用
  async function saveImportedImage(dataUrl, category) {
    // 支持 data:image/png;base64,xxx 或纯 base64
    const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
    const b64 = m ? m[2] : dataUrl
    const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'png'
    if (!IMAGE_EXT.has('.' + ext)) throw new Error('不支持的图片格式')
    const buffer = Buffer.from(b64, 'base64')
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
    // 去重：同分类里已有相同内容的图 → 直接复用，不重复保存
    const history = await readHistory()
    const list = history[category] || []
    for (const item of list) {
      if (item.hash === hash) return item.name
    }
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
    await mkdir(IMAGES_DIR, { recursive: true })
    await writeFile(path.join(IMAGES_DIR, name), buffer)
    // 记录历史
    history[category] = list
    history[category].push({ name, ts: Date.now(), hash })
    await writeHistory(history)
    return name
  }

  /* ---------------- 预设 / 随机装扮 存储辅助 ---------------- */

  async function readJsonFile(file, fallback) {
    try {
      const raw = await readFile(file, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object') return parsed
    } catch { /* 回退默认 */ }
    return fallback
  }
  async function writeJsonFile(file, data) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  const readPresets = () => readJsonFile(PRESETS_FILE, [])
  const writePresets = (presets) => writeJsonFile(PRESETS_FILE, presets)
  // 随机池（新版）：{ enabled, presetNames: [] }，presetNames 为空 = 使用全部自定义预设
  // 兼容旧版文件夹池（folder/mode/outfits）→ 迁移为空预设选择
  const readRandomPool = async () => {
    const pool = await readJsonFile(RANDOM_POOL_FILE, { enabled: false, presetNames: [] })
    if (pool.folder !== undefined || pool.mode !== undefined || pool.outfits !== undefined) {
      const migrated = { enabled: !!pool.enabled, presetNames: [] }
      await writeJsonFile(RANDOM_POOL_FILE, migrated)
      return migrated
    }
    return { enabled: !!pool.enabled, presetNames: Array.isArray(pool.presetNames) ? pool.presetNames : [] }
  }
  const writeRandomPool = (pool) => writeJsonFile(RANDOM_POOL_FILE, pool)

  /* ---------------- HTTP 路由（client 半调用） ---------------- */

  const disposers = [
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/push',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const text = String(body.text || '').trim()
        if (!text) { sendJson(res, 200, { ok: false, error: 'text 不能为空' }); return }
        const item = makeItem(text, body.link, body.source)
        queue.push(item)
        sendJson(res, 200, { ok: true, id: item.id })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/poll',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        const items = queue.splice(0, queue.length)
        sendJson(res, 200, { ok: true, items })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/set-ai-summary',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const sessionId = String(body.sessionId || '')
        const enabled = !!body.enabled
        if (sessionId) aiSummaryBySession.set(sessionId, enabled)
        sendJson(res, 200, { ok: true, enabled })
      },
    }),
    // 预设素材：/__notify/asset?name=<文件名> — 只读插件 assets 目录
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/asset',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'))
        const name = String(url.searchParams.get('name') || '')
        if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
          sendJson(res, 400, { ok: false, error: 'invalid asset name' })
          return
        }
        const ext = path.extname(name).toLowerCase()
        if (!IMAGE_EXT.has(ext)) { sendJson(res, 400, { ok: false, error: 'not an image' }); return }
        try {
          const data = await readFile(path.join(ASSETS_DIR, name))
          res.writeHead(200, {
            'content-type': ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/bmp',
            'cache-control': 'public, max-age=86400',
            'content-length': data.length,
          })
          res.end(data)
        } catch {
          sendJson(res, 404, { ok: false, error: 'asset not found' })
        }
      },
    }),
    // 自定义本地图片：/__notify/file?path=<本地路径> — 带安全校验
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/file',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'))
        const filePath = String(url.searchParams.get('path') || '')
        if (!filePath) { sendJson(res, 400, { ok: false, error: 'path required' }); return }
        const ext = path.extname(filePath).toLowerCase()
        if (!IMAGE_EXT.has(ext)) { sendJson(res, 400, { ok: false, error: 'not an image' }); return }
        try {
          const data = await readFile(filePath)
          res.writeHead(200, {
            'content-type': ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/bmp',
            'cache-control': 'no-store',
            'content-length': data.length,
          })
          res.end(data)
        } catch {
          sendJson(res, 404, { ok: false, error: 'file not found' })
        }
      },
    }),
    // 读取用户导入的素材：/__notify/user-image?name=<文件>
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/user-image',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'))
        const name = String(url.searchParams.get('name') || '')
        if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
          sendJson(res, 400, { ok: false, error: 'invalid name' })
          return
        }
        const ext = path.extname(name).toLowerCase()
        if (!IMAGE_EXT.has(ext)) { sendJson(res, 400, { ok: false, error: 'not an image' }); return }
        try {
          const data = await readFile(path.join(IMAGES_DIR, name))
          res.writeHead(200, {
            'content-type': ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/bmp',
            'cache-control': 'public, max-age=86400',
            'content-length': data.length,
          })
          res.end(data)
        } catch {
          sendJson(res, 404, { ok: false, error: 'image not found' })
        }
      },
    }),
    // 导入并保存素材：POST { dataUrl, category }
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/import-image',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const dataUrl = String(body.dataUrl || '')
        const category = String(body.category || '')
        if (!dataUrl || !['bubbleBg', 'bubbleBorder', 'windowBg', 'windowBorder'].includes(category)) {
          sendJson(res, 400, { ok: false, error: 'dataUrl and valid category required' })
          return
        }
        try {
          const name = await saveImportedImage(dataUrl, category)
          sendJson(res, 200, { ok: true, name, url: '/__notify/user-image?name=' + encodeURIComponent(name) })
        } catch (e) {
          sendJson(res, 400, { ok: false, error: String((e && e.message) || e) })
        }
      },
    }),
    // 历史列表：GET /__notify/history
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/history',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        const history = await readHistory()
        sendJson(res, 200, { ok: true, history })
      },
    }),
    // 删除历史素材：POST { name, category }
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/history/delete',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const name = String(body.name || '')
        const category = String(body.category || '')
        if (!name || !['bubbleBg', 'bubbleBorder', 'windowBg', 'windowBorder'].includes(category)) {
          sendJson(res, 400, { ok: false, error: 'name and valid category required' })
          return
        }
        const history = await readHistory()
        const list = history[category] || []
        history[category] = list.filter((item) => item.name !== name)
        await writeHistory(history)
        // 删除文件（忽略错误）
        try { await rm(path.join(IMAGES_DIR, name), { force: true }) } catch { /* 忽略 */ }
        sendJson(res, 200, { ok: true })
      },
    }),
    // 自定义预设（泡泡外观全套，存磁盘、可改名）：列表 / 保存 / 改名 / 删除
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/presets',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        sendJson(res, 200, { ok: true, presets: await readPresets() })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/presets/save',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const name = String(body.name || '').trim()
        const preset = body.preset && typeof body.preset === 'object' ? body.preset : null
        if (!name || !preset) { sendJson(res, 400, { ok: false, error: 'name and preset required' }); return }
        const presets = await readPresets()
        const idx = presets.findIndex((p) => p.name === name)
        const entry = { name, ...preset, ts: Date.now() }
        if (idx >= 0) presets[idx] = entry; else presets.push(entry)
        await writePresets(presets)
        sendJson(res, 200, { ok: true })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/presets/rename',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const oldName = String(body.oldName || '')
        const newName = String(body.newName || '').trim()
        if (!oldName || !newName) { sendJson(res, 400, { ok: false, error: 'oldName and newName required' }); return }
        const presets = await readPresets()
        const idx = presets.findIndex((p) => p.name === oldName)
        if (idx < 0) { sendJson(res, 404, { ok: false, error: 'preset not found' }); return }
        presets[idx].name = newName
        await writePresets(presets)
        sendJson(res, 200, { ok: true })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/presets/delete',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const name = String(body.name || '')
        const presets = await readPresets()
        await writePresets(presets.filter((p) => p.name !== name))
        sendJson(res, 200, { ok: true })
      },
    }),
    // 随机装扮池：读取 / 保存（从用户导入的自定义预设里随机）
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/random-pool',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        sendJson(res, 200, { ok: true, pool: await readRandomPool() })
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/__notify/random-pool/save',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readJson(req)
        const pool = {
          enabled: !!(body.pool && body.pool.enabled),
          presetNames: Array.isArray(body.pool && body.pool.presetNames) ? body.pool.presetNames.map(String) : [],
        }
        await writeRandomPool(pool)
        sendJson(res, 200, { ok: true, pool })
      },
    }),
  ]

  ctx.effect(() => {
    return () => {
      for (const dispose of disposers) {
        try { dispose() } catch { /* 忽略 */ }
      }
    }
  }, 'dsh-notify: routes')

  /* ---------------- 工具注册（全局，任何预设可用） ---------------- */

  ctx.inject(['tools'], (inner) => {
    const tool = {
      name: 'notify_push',
      description: '向用户输入框右侧的「提醒泡泡」面板推送一条提醒。text 为提醒内容；link 可选（可点击链接）；source 可选（来源标识）。用户开启了 AI 总结时，请先把信息总结成简洁要点再推送。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', description: '提醒内容文本' },
          link: { type: 'string', description: '可选：可点击的链接 URL' },
          source: { type: 'string', description: '可选：来源标识' },
        },
        required: ['text'],
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(_args, value) {
          return [{ type: 'text', text: JSON.stringify(value) }]
        },
      },
      async execute(args, exec) {
        const text = String((args && args.text) || '').trim()
        if (!text) return { ok: false, error: 'text 不能为空' }
        const item = makeItem(text, args && args.link, args && args.source)
        queue.push(item)
        return { ok: true, id: item.id }
      },
    }
    try {
      inner.tools.register(tool)
    } catch { /* 重复注册等，忽略 */ }
  })

  /* ---------------- systemPrompt 注入（AI 总结） ---------------- */

  ctx.inject(['systemPrompt'], (inner) => {
    inner.systemPrompt.context({
      name: 'notify:ai-summary',
      order: 120,
      text: (assembleCtx) => {
        const agent = assembleCtx && assembleCtx.agent ? assembleCtx.agent : undefined
        const session = agent && agent.session ? agent.session : undefined
        if (!session) return ''
        const enabled = aiSummaryBySession.get(String(session.id)) === true
        if (!enabled) return ''
        return '用户开启了「提醒泡泡的 AI 总结」：当你需要提醒用户时，请先查看相关提醒信息，把内容总结成简洁要点，再用 notify_push 工具推送给用户。'
      },
    })
  })
}
