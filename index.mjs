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
 */
export const name = 'dsh-notify'
export const inject = ['webServer']

const MAX_BODY_BYTES = 64 * 1024

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
