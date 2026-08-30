/**
 * dsh-notify — 提醒泡泡静态 profile 插件（client 半）
 *
 * 手写 client bundle（与 dshmarket / ui-trajectory 构建产物同构）：
 *   window.__ModuleLoader__.load({ id, factory })
 * factory 用 require() 取 react 等 seed 模块，导出 apply/inject。
 *
 * 注意：静态 client bundle 没有动态插件的 `styles` Builtin——
 * 样式用 document.createElement('style') 手动注入（apply 内）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-notify',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    const inject = ['slots']

    /* ---------- 样式（静态 client：document 注入，不用 styles） ---------- */
    const CSS = `
[data-notify-bubble-panel] {
  position: fixed;
  z-index: 5;
  background: transparent;
  color: var(--dsw-alias-label-primary, #111);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 160px;
  min-height: 120px;
}
/* 窗口背景层（文字下层） */
[data-notify-window-bg] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
/* 窗口边框层（文字上层） */
[data-notify-window-border] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
[data-notify-bubble-list] {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  padding: 8px;
}
[data-notify-bubble-item] {
  position: relative;
  flex: none;
  min-height: 32px;
  cursor: default;
  user-select: text;
}
/* 泡泡背景层（文字下层） */
[data-notify-bubble-bg] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
/* 泡泡边框层（文字上层） */
[data-notify-bubble-border] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
/* 泡泡文字（中间层） */
[data-notify-bubble-text] {
  position: relative;
  z-index: 1;
  font-size: 13px;
  line-height: 1.5;
  max-height: calc(6 * 1.5em + 16px);
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: default;
  user-select: text;
}
[data-notify-bubble-source] {
  display: block;
  font-size: 11px;
  color: inherit;
  margin-bottom: 2px;
}
[data-notify-bubble-copy] {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 3;
}
[data-notify-bubble-copy]:hover { background: var(--dsw-alias-bg-layer-1, #eee); }
[data-notify-bubble-link] {
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
}
[data-notify-bubble-footer] {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  flex-wrap: wrap;
  background: transparent;
}
[data-notify-bubble-toggle] {
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent;
  color: inherit;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
[data-notify-bubble-toggle]:hover { background: var(--dsw-alias-bg-layer-2, #eee); }
[data-notify-bubble-toggle][data-on='true'] {
  border-color: var(--dsw-alias-brand-primary, #4a9eff);
  color: var(--dsw-alias-brand-primary, #4a9eff);
}
[data-notify-bubble-entry] {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  position: relative;
  display: inline-flex;
  align-items: center;
  font-size: 15px;
}
[data-notify-bubble-entry]:hover { background: var(--dsw-alias-bg-layer-2, #eee); }
[data-notify-bubble-badge] {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--dsw-alias-brand-primary, #4a9eff);
  color: #fff;
  font-size: 9px;
  border-radius: 8px;
  padding: 0 4px;
  min-width: 14px;
  text-align: center;
}
[data-notify-bubble-resize] {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 10;
}
[data-notify-bubble-resize]::after {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--dsw-alias-label-secondary, #888);
  border-bottom: 2px solid var(--dsw-alias-label-secondary, #888);
  border-bottom-right-radius: 3px;
}
[data-notify-bubble-resize-top] {
  position: absolute;
  right: 0;
  top: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
  z-index: 10;
}
[data-notify-bubble-resize-top]::after {
  content: '';
  position: absolute;
  right: 3px;
  top: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--dsw-alias-label-secondary, #888);
  border-top: 2px solid var(--dsw-alias-label-secondary, #888);
  border-top-right-radius: 3px;
}
[data-notify-restart-btn] {
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #555);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
[data-notify-restart-btn]:hover { background: var(--dsw-alias-bg-layer-2, #eee); color: var(--dsw-alias-label-primary, #111); }
[data-notify-restart-btn][data-busy='true'] { opacity: 0.6; cursor: wait; }
/* 外观选择器 */
[data-notify-appearance] {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--dsw-alias-bg-layer-1, #fff);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 10px;
  gap: 8px;
  font-size: 12px;
}
[data-notify-appearance-title] { font-weight: 600; font-size: 13px; }
[data-notify-appearance-row] { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
[data-notify-appearance-label] { min-width: 90px; color: var(--dsw-alias-label-secondary, #666); }
[data-notify-appearance-input] {
  flex: 1; min-width: 120px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent; color: inherit;
  padding: 3px 6px; border-radius: 4px; font-size: 11px;
}
[data-notify-appearance-select] {
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent; color: inherit;
  padding: 3px 6px; border-radius: 4px; font-size: 11px;
}
[data-notify-appearance-range] { flex: 1; min-width: 100px; }
[data-notify-appearance-btn] {
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent; color: inherit;
  padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
}
[data-notify-appearance-btn]:hover { background: var(--dsw-alias-bg-layer-2, #eee); }
[data-notify-appearance-btn][data-active='true'] {
  border-color: var(--dsw-alias-brand-primary, #4a9eff);
  color: var(--dsw-alias-brand-primary, #4a9eff);
}
[data-notify-appearance-color] { width: 26px; height: 22px; border: 1px solid var(--dsw-alias-border-l2, #ccc); border-radius: 4px; cursor: pointer; padding: 0; }
[data-notify-appearance-sep] { border-top: 1px solid var(--dsw-alias-border-l1, #e0e0e0); margin: 2px 0; }
/* 历史素材缩略图 */
/* 历史行标签独占一行（避免与缩略图挤在同一行导致换行错乱） */
[data-notify-history-label] { flex-basis: 100%; min-width: 100%; }
[data-notify-history-thumbs] {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  flex: 1; min-width: 0;
}
[data-notify-history-item] { position: relative; display: inline-flex; }
[data-notify-history-item] img {
  width: 48px; height: 36px; object-fit: contain;
  border: 2px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 4px; cursor: pointer; background: var(--dsw-alias-bg-layer-2, #f5f5f5);
  display: block;
}
[data-notify-history-item] img:hover { border-color: var(--dsw-alias-brand-primary, #4a9eff); }
[data-notify-history-item] img[data-active='true'] { border-color: var(--dsw-alias-brand-primary, #4a9eff); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, #4a9eff); }
/* 删除按钮：贴在缩略图右上角内部，不向外凸出，避免挤压相邻缩略图 */
[data-notify-history-del] {
  position: absolute; top: 0; right: 0;
  width: 14px; height: 14px; line-height: 12px; padding: 0;
  border: none; border-radius: 0 3px 0 3px;
  background: rgba(0, 0, 0, 0.45); color: #fff; cursor: pointer; font-size: 9px;
}
[data-notify-history-del]:hover { background: #d33; }
[data-notify-history-empty] { color: var(--dsw-alias-label-tertiary, #999); font-size: 11px; }
[data-notify-history-fold-btn] {
  color: var(--dsw-alias-label-secondary, #666); font-size: 11px;
  border: 1px dashed var(--dsw-alias-border-l2, #ccc);
  border-radius: 4px; padding: 3px 8px; line-height: 1.6;
  background: transparent; cursor: pointer; flex: none;
}
[data-notify-history-fold-btn]:hover {
  border-color: var(--dsw-alias-brand-primary, #4a9eff);
  color: var(--dsw-alias-brand-primary, #4a9eff);
  background: var(--dsw-alias-bg-layer-2, #f5f5f5);
}
[data-notify-import-error] {
  color: var(--dsw-alias-label-danger, #d33); font-size: 11px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 4px; padding: 4px 8px; background: rgba(221, 51, 51, 0.06);
}
/* 外观面板外框：窗口背景/边框作为底，外观菜单透明显示在框内 */
[data-notify-appearance-frame] {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
[data-notify-appearance-frame] [data-notify-window-bg] { z-index: 0; }
[data-notify-appearance-frame] [data-notify-window-border] { z-index: 1; }
[data-notify-appearance-frame] [data-notify-appearance] { z-index: 2; }
/* 实时预览 */
[data-notify-appearance-preview] { display: flex; flex-direction: column; gap: 6px; }
[data-notify-preview-caption] { font-size: 11px; color: var(--dsw-alias-label-tertiary, #999); }
[data-notify-preview-window] {
  position: relative;
  height: 120px; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: var(--dsw-alias-bg-layer-2, #f5f5f5);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 8px;
}
[data-notify-preview-window-bg] { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
[data-notify-preview-window-border] { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
[data-notify-preview-bubble] {
  position: relative; z-index: 1;
  min-height: 40px; max-width: 100%;
  border-radius: 8px; overflow: hidden;
  display: flex; align-items: center;
}
[data-notify-preview-bg] { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
[data-notify-preview-border] { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
[data-notify-preview-text] {
  position: relative; z-index: 1;
  font-size: 12px; line-height: 1.5; word-break: break-word;
}
`

    /* ---------- 插件主体 ---------- */

    function apply(ctx) {
      if (!ctx.slots) return

      // 静态 client 无 styles Builtin：手动注入 <style>（data-dyn 标记便于调试）
      let styleTag = null
      try {
        styleTag = document.createElement('style')
        styleTag.dataset.dyn = 'dsh-notify'
        styleTag.textContent = CSS
        document.head.appendChild(styleTag)
      } catch { /* 样式注入失败不阻塞功能 */ }

      // 模块级共享 store（面板与按钮共享状态）
      const store = {
        items: [],
        enabled: true,
        aiSummary: false,
        open: true,
        appearanceOpen: false,
        listeners: new Set(),
      }
      const notify = () => { for (const l of store.listeners) { try { l() } catch { /* 忽略 */ } } }
      const subscribe = (fn) => { store.listeners.add(fn); return () => store.listeners.delete(fn) }
      const push = (entry) => {
        if (!store.enabled) return
        const item = {
          id: (entry && entry.id) || 'c' + Math.random().toString(36).slice(2, 8),
          text: String((entry && entry.text) || ''),
          link: entry && entry.link ? String(entry.link) : '',
          source: entry && entry.source ? String(entry.source) : '',
          ts: (entry && entry.ts) || Date.now(),
        }
        // column-reverse 把数组头显示在底部：新消息插到数组开头 → 显示在面板底部
        store.items = [item, ...store.items]
        notify()
      }

      // 预置欢迎泡泡（第一条，最旧，在顶部）
      store.items = [{
        id: 'welcome',
        text: '🎉 提醒泡泡已就绪！任何插件或 AI 都能通过 notify_push / notify/push 推送提醒。',
        link: '',
        source: '提醒泡泡',
        ts: Date.now(),
      }]

      // ---------- 外观系统 ----------
      const APPEARANCE_KEY = 'dsh-notify-appearance'
      const DEFAULT_APPEARANCE = {
        preset: 'bubble1',
        // 泡泡：背景/边框图片 + 是否拉伸
        bubbleBg: { path: '/__notify/assets/泡泡背景1.png', stretch: true },
        bubbleBorder: { path: '/__notify/assets/泡泡边框.png', stretch: true },
        bubbleBgOpacity: 1,
        bubbleBorderOpacity: 1,
        // 窗口：背景/边框图片 + 是否拉伸
        windowBg: { path: '/__notify/assets/窗口背景.png', stretch: true },
        windowBorder: { path: '/__notify/assets/窗口边框.png', stretch: true },
        windowBgOpacity: 1,
        windowBorderOpacity: 1,
        // 文字
        padding: 10,
        textColor: '#111111',
      }
      const loadAppearance = () => {
        try {
          const raw = localStorage.getItem(APPEARANCE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            return { ...DEFAULT_APPEARANCE, ...parsed }
          }
        } catch { /* 回退默认 */ }
        return { ...DEFAULT_APPEARANCE }
      }
      const appearance = loadAppearance()
      const saveAppearance = () => {
        try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)) } catch { /* 忽略 */ }
      }

      // 图片 URL：预设走 /__notify/asset?name=，自定义本地路径走 /__notify/file?path=
      const imgUrl = (path) => {
        if (!path) return ''
        if (path.startsWith('/__notify/assets/')) {
          const name = path.slice('/__notify/assets/'.length)
          return '/__notify/asset?name=' + encodeURIComponent(name)
        }
        if (path.startsWith('/__notify/')) return path
        if (path.startsWith('data:')) return path
        return '/__notify/file?path=' + encodeURIComponent(path)
      }

      // 开放接口：notifyCenter 服务（其他 client 插件可 ctx.get('notifyCenter')）
      const notifyCenter = {
        push(entry) { push(entry); return { ok: true } },
        clear() { store.items = []; notify(); return { ok: true } },
        setEnabled(enabled) { store.enabled = !!enabled; notify(); return { ok: true } },
      }
      const disposeProvide = ctx.provide('notifyCenter', notifyCenter)

      // host 推送：轮询拉取（静态 host 走 HTTP）
      const pollHost = () => {
        fetch('/__notify/poll', { cache: 'no-store' })
          .then((res) => res.json())
          .then((res) => {
            if (res && res.ok && Array.isArray(res.items)) {
              for (const item of res.items) push(item)
            }
          }).catch(() => {})
      }

      /* ---------- 组件 ---------- */

      function BubblePanel(props) {
        const sessionId = props.sessionId
        const [items, setItems] = React.useState(store.items)
        const [enabled, setEnabled] = React.useState(store.enabled)
        const [aiSummary, setAiSummary] = React.useState(store.aiSummary)
        const [expanded, setExpanded] = React.useState(false)
        const [open, setOpen] = React.useState(store.open)
        const [appearanceOpen, setAppearanceOpen] = React.useState(store.appearanceOpen)
        const [pos, setPos] = React.useState(null)
        const [userSize, setUserSize] = React.useState(null)
        const dragRef = React.useRef(null)
        const listRef = React.useRef(null)

        React.useEffect(() => {
          const unsubscribe = subscribe(() => {
            setItems(store.items)
            setEnabled(store.enabled)
            setAiSummary(store.aiSummary)
            setOpen(store.open)
            setAppearanceOpen(store.appearanceOpen)
            const list = listRef.current
            if (list) {
              const timer = ctx.get('timer')
              const scroll = () => { list.scrollTop = 0 }
              if (timer && typeof timer.timeout === 'function') timer.timeout(scroll, 30)
              else scroll()
            }
          })
          return unsubscribe
        }, [])

        // 测量：载入即用「重置大小」尺寸（宽度自适应 + 高度到屏幕顶端）
        React.useEffect(() => {
          const measure = () => {
            const card = document.querySelector('[data-composer-card]')
            const vw = window.innerWidth
            const vh = window.innerHeight
            const bottom = 8
            let left = 0
            let autoWidth = 300
            if (card) {
              const cr = card.getBoundingClientRect()
              // 与输入卡右侧的可拖拽边栏保持 10px 间隙，再整体右移 34px 避免重叠
              const gap = 44
              left = cr.right + gap
              const avail = vw - cr.right - gap - 8
              autoWidth = Math.max(160, Math.min(340, avail))
            } else {
              left = vw - 350
              autoWidth = 300
            }
            // 面板最高到「标题栏下方」：标题栏高约 76px（header y=0~76, z=9），顶部保留 82px
            const HEADER_RESERVE = 82
            const maxToTop = Math.max(120, vh - HEADER_RESERVE)
            const width = userSize && userSize.width != null ? userSize.width : autoWidth
            const height = userSize && userSize.height != null ? userSize.height : maxToTop
            setPos({ bottom, left, width, height, maxToTop, autoWidth })
          }
          measure()
          window.addEventListener('resize', measure)
          const timer = ctx.get('timer')
          let dispose = null
          if (timer && typeof timer.interval === 'function') {
            dispose = timer.interval(measure, 800)
          }
          return () => {
            window.removeEventListener('resize', measure)
            try { if (dispose) dispose() } catch { /* 忽略 */ }
          }
        }, [sessionId, userSize])

        // 轮询 host 推送队列（静态 host：/__notify/poll）
        React.useEffect(() => {
          const timer = ctx.get('timer')
          if (!timer || typeof timer.interval !== 'function') return
          const dispose = timer.interval(pollHost, 1200)
          return () => { try { if (dispose) dispose() } catch { /* 忽略 */ } }
        }, [sessionId])

        const copyText = (text) => {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).catch(() => {})
            }
          } catch { /* 剪贴板不可用时忽略 */ }
        }

        const toggleAiSummary = () => {
          const next = !store.aiSummary
          store.aiSummary = next
          notify()
          fetch('/__notify/set-ai-summary', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, enabled: next }),
          }).catch(() => {})
        }

        const resetSize = () => {
          setExpanded(false)
          if (pos) {
            setUserSize({ width: pos.autoWidth, height: pos.maxToTop })
          }
        }

        const startResize = (e) => {
          e.preventDefault()
          e.stopPropagation()
          const startX = e.clientX
          const startY = e.clientY
          const startW = (pos && pos.width) || 300
          const startH = (pos && pos.height) || 300
          dragRef.current = { startX, startY, startW, startH, mode: 'both' }
          const onMove = (ev) => {
            const d = dragRef.current
            if (!d) return
            const w = Math.max(160, Math.min(560, d.startW + (ev.clientX - d.startX)))
            const h = Math.max(120, Math.min((pos && pos.maxToTop) || 560, d.startH + (ev.clientY - d.startY)))
            setUserSize({ width: w, height: h })
          }
          const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }

        const startResizeTop = (e) => {
          e.preventDefault()
          e.stopPropagation()
          const startX = e.clientX
          const startY = e.clientY
          const startW = (pos && pos.width) || 300
          const startH = (pos && pos.height) || 300
          dragRef.current = { startX, startY, startW, startH, mode: 'top' }
          const onMove = (ev) => {
            const d = dragRef.current
            if (!d) return
            const w = Math.max(160, Math.min(560, d.startW + (ev.clientX - d.startX)))
            const h = Math.max(120, Math.min((pos && pos.maxToTop) || 560, d.startH + (d.startY - ev.clientY)))
            setUserSize({ width: w, height: h })
          }
          const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }

        if (!open || !pos) return null
        const style = {
          left: pos.left,
          bottom: pos.bottom,
          width: pos.width,
          height: pos.height,
          // 文字颜色作用于面板内所有文字（泡泡、来源、链接、底部按钮都继承）
          color: appearance.textColor,
        }
        // 外观层：窗口背景（下层）、窗口边框（上层）、列表（中间）
        // stretch=true → 拉伸铺满（fill，可能变形）；false → contain：等比缩放到完全放进容器、绝不超出，至少一条边贴住容器（宽图贴宽、高图贴高），另一边留白
        const windowBg = appearance.windowBg && appearance.windowBg.path
          ? React.createElement('img', {
              key: 'wbg',
              'data-notify-window-bg': '',
              src: imgUrl(appearance.windowBg.path),
              style: {
                opacity: appearance.windowBgOpacity || 1,
                objectFit: appearance.windowBg.stretch ? 'fill' : 'contain',
              },
              draggable: false,
            })
          : null
        const windowBorder = appearance.windowBorder && appearance.windowBorder.path
          ? React.createElement('img', {
              key: 'wbrd',
              'data-notify-window-border': '',
              src: imgUrl(appearance.windowBorder.path),
              style: {
                opacity: appearance.windowBorderOpacity || 1,
                objectFit: appearance.windowBorder.stretch ? 'fill' : 'contain',
              },
              draggable: false,
            })
          : null
        // 外观选择器打开时：窗口背景/边框作为面板外框，外观菜单显示在框内（透明背景露出边框）
        if (appearanceOpen) {
          const hasFrame = !!(appearance.windowBg && appearance.windowBg.path) || !!(appearance.windowBorder && appearance.windowBorder.path)
          return React.createElement('div', {
            'data-notify-bubble-panel': '',
            style,
          }, [
            React.createElement('div', { key: 'frame', 'data-notify-appearance-frame': '' }, [
              windowBg,
              windowBorder,
              React.createElement(AppearancePicker, { key: 'appearance', sessionId, transparent: hasFrame }),
            ]),
          ])
        }
        return React.createElement('div', {
          'data-notify-bubble-panel': '',
          'data-expanded': expanded ? 'true' : 'false',
          style,
        }, [
          windowBg,
          windowBorder,
          React.createElement('div', { key: 'list', 'data-notify-bubble-list': '', ref: listRef }, items.map((item) => {
            const linkEl = item.link
              ? React.createElement('span', {
                  key: 'l',
                  'data-notify-bubble-link': '',
                  onClick: () => {
                    try { if (typeof window !== 'undefined') window.open(item.link, '_blank') } catch { /* 忽略 */ }
                  },
                }, '🔗 链接')
              : null
            const sourceEl = item.source
              ? React.createElement('span', { key: 's', 'data-notify-bubble-source': '' }, '来自：' + item.source)
              : null
            // 泡泡分层：背景（下层）、文字（中间）、边框（上层）
            const bubbleBg = appearance.bubbleBg && appearance.bubbleBg.path
              ? React.createElement('img', {
                  key: 'bbg',
                  'data-notify-bubble-bg': '',
                  src: imgUrl(appearance.bubbleBg.path),
                  style: {
                    opacity: appearance.bubbleBgOpacity || 1,
                    objectFit: appearance.bubbleBg.stretch ? 'fill' : 'contain',
                  },
                  draggable: false,
                })
              : null
            const bubbleBorder = appearance.bubbleBorder && appearance.bubbleBorder.path
              ? React.createElement('img', {
                  key: 'bbrd',
                  'data-notify-bubble-border': '',
                  src: imgUrl(appearance.bubbleBorder.path),
                  style: {
                    opacity: appearance.bubbleBorderOpacity || 1,
                    objectFit: appearance.bubbleBorder.stretch ? 'fill' : 'contain',
                  },
                  draggable: false,
                })
              : null
            return React.createElement('div', {
              key: item.id,
              'data-notify-bubble-item': '',
              onDoubleClick: () => setExpanded((v) => !v),
              title: '双击展开/收起',
              style: { padding: appearance.padding },
            }, [
              bubbleBg,
              bubbleBorder,
              React.createElement('div', { key: 'text', 'data-notify-bubble-text': '', style: { color: appearance.textColor, padding: appearance.padding } }, [
                sourceEl,
                item.text,
                linkEl,
              ]),
              React.createElement('button', {
                key: 'c',
                'data-notify-bubble-copy': '',
                onClick: (e) => { e.stopPropagation(); copyText(item.text + (item.link ? ' ' + item.link : '')) },
                title: '复制',
              }, '⧉'),
            ])
          })),
          React.createElement('div', { key: 'footer', 'data-notify-bubble-footer': '' }, [
            React.createElement('button', {
              key: 'toggle',
              'data-notify-bubble-toggle': '',
              'data-on': enabled ? 'true' : 'false',
              onClick: () => {
                store.enabled = !store.enabled
                notify()
              },
            }, enabled ? '提醒：开' : '提醒：关'),
            React.createElement('button', {
              key: 'reset',
              'data-notify-bubble-toggle': '',
              onClick: resetSize,
              title: '重置大小（宽度自适应、高度到屏幕顶端）',
            }, '重置大小'),
            React.createElement('button', {
              key: 'ai',
              'data-notify-bubble-toggle': '',
              'data-on': aiSummary ? 'true' : 'false',
              onClick: toggleAiSummary,
              title: '用 AI 总结提醒内容后再推送',
            }, aiSummary ? 'AI总结：开' : 'AI总结：关'),
            React.createElement('button', {
              key: 'appearance',
              'data-notify-bubble-toggle': '',
              onClick: () => { store.appearanceOpen = !store.appearanceOpen; notify() },
              title: '外观设置（预设/自定义）',
            }, '外观'),
            React.createElement('button', {
              key: 'close',
              'data-notify-bubble-toggle': '',
              onClick: () => { store.open = false; notify() },
              title: '隐藏面板',
            }, '收起'),
          ]),
          React.createElement('div', { key: 'rz', 'data-notify-bubble-resize': '', onMouseDown: startResize, title: '拖拽调整大小' }),
          React.createElement('div', { key: 'rz-top', 'data-notify-bubble-resize-top': '', onMouseDown: startResizeTop, title: '向上拉伸到屏幕顶端' }),
        ])
      }

      function BubbleEntry(props) {
        const [badge, setBadge] = React.useState(0)
        React.useEffect(() => {
          return subscribe(() => {
            const n = store.items.length
            setBadge(n)
            if (store.open) setBadge(0)
          })
        }, [])
        const openPanel = () => {
          store.open = true
          notify()
        }
        return React.createElement('button', {
          'data-notify-bubble-entry': '',
          onClick: openPanel,
          title: '提醒面板',
        }, [
          React.createElement('span', { key: 'i' }, '🔔'),
          badge > 0
            ? React.createElement('span', { key: 'b', 'data-notify-bubble-badge': '' }, badge > 99 ? '99+' : String(badge))
            : null,
        ])
      }

      // ---------- 快速重启按钮（输入框左侧） ----------
      // 点一次 = 服务器重启（/dsh-market/restart）+ 桌面窗口关闭重开（/__notify/restart-app）
      function RestartButton(props) {
        const [busy, setBusy] = React.useState(false)
        const doRestart = () => {
          if (busy) return
          setBusy(true)
          const markDone = () => setBusy(false)
          fetch('/dsh-market/restart', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          }).catch(() => {})
          fetch('/__notify/restart-app', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          }).then((res) => {
            if (!(res.status === 202 || res.ok)) markDone()
          }).catch(markDone)
          // 服务器重启会杀掉当前页面，按钮状态交给新窗口
        }
        return React.createElement('button', {
          'data-notify-restart-btn': '',
          'data-busy': busy ? 'true' : 'false',
          onClick: doRestart,
          title: '重启 DeepSeek Harness（服务器 + 窗口关闭重开）',
        }, [
          React.createElement('span', { key: 'i' }, busy ? '⏳' : '🔄'),
          React.createElement('span', { key: 't' }, busy ? '重启中…' : '重启'),
        ])
      }

      // ---------- 外观选择器（预设 + 自定义） ----------
      function AppearancePicker(props) {
        // 预设定义：桌面素材装扮（内置）
        const PRESETS = [
          {
            id: 'bubble1',
            name: '泡泡预设1',
            appearance: {
              preset: 'bubble1',
              bubbleBg: { path: '/__notify/assets/泡泡背景1.png', stretch: true },
              bubbleBorder: { path: '/__notify/assets/泡泡边框.png', stretch: true },
              bubbleBgOpacity: 1,
              bubbleBorderOpacity: 1,
              windowBg: { path: '/__notify/assets/窗口背景.png', stretch: true },
              windowBorder: { path: '/__notify/assets/窗口边框.png', stretch: true },
              windowBgOpacity: 1,
              windowBorderOpacity: 1,
              padding: 10,
              textColor: '#111111',
            },
          },
          {
            id: 'default',
            name: '默认简洁',
            appearance: {
              preset: 'default',
              bubbleBg: { path: '', stretch: true },
              bubbleBorder: { path: '', stretch: true },
              bubbleBgOpacity: 1,
              bubbleBorderOpacity: 1,
              windowBg: { path: '', stretch: true },
              windowBorder: { path: '', stretch: true },
              windowBgOpacity: 1,
              windowBorderOpacity: 1,
              padding: 10,
              textColor: '#111111',
            },
          },
        ]
        const [appVer, setAppVer] = React.useState(0)
        const refresh = () => setAppVer((v) => v + 1)
        const applyPreset = (preset) => {
          const a = preset.appearance
          appearance.preset = a.preset
          appearance.bubbleBg = { ...a.bubbleBg }
          appearance.bubbleBorder = { ...a.bubbleBorder }
          appearance.windowBg = { ...a.windowBg }
          appearance.windowBorder = { ...a.windowBorder }
          appearance.bubbleBgOpacity = a.bubbleBgOpacity
          appearance.bubbleBorderOpacity = a.bubbleBorderOpacity
          appearance.windowBgOpacity = a.windowBgOpacity
          appearance.windowBorderOpacity = a.windowBorderOpacity
          appearance.padding = a.padding
          appearance.textColor = a.textColor
          saveAppearance()
          refresh()
        }
        // 通用：更新一个图片槽（path/stretch）
        const setSlot = (slot, field, value) => {
          appearance[slot][field] = value
          appearance.preset = 'custom'
          saveAppearance()
          refresh()
        }
        const setNum = (field, value) => {
          appearance[field] = Number(value)
          appearance.preset = 'custom'
          saveAppearance()
          refresh()
        }
        const setTextColor = (value) => {
          appearance.textColor = value
          appearance.preset = 'custom'
          saveAppearance()
          refresh()
        }
        const TEXT_COLORS = ['#111111', '#ffffff', '#1a3c6e', '#c0392b', '#1e8449', '#7d3c98', '#d35400']

        // 色号输入：校验 + 草稿（无效输入不应用，只在框里显示）
        const isValidHex = (c) => typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)
        const normalizeHex = (c) => {
          if (!isValidHex(c)) return '#000000'
          if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
          return c
        }
        const [textColorDraft, setTextColorDraft] = React.useState(appearance.textColor)
        React.useEffect(() => { setTextColorDraft(appearance.textColor) }, [appearance.textColor])

        // ---------- 历史素材（持久化在插件数据目录，重启不丢） ----------
        const [history, setHistory] = React.useState(null)
        const [importError, setImportError] = React.useState('')
        // 每个分类可展开/折叠（默认折叠，最多显示 3 张）
        const [expanded, setExpanded] = React.useState({})
        const toggleExpand = (category) => {
          setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
        }
        const loadHistory = () => {
          fetch('/__notify/history', { cache: 'no-store' })
            .then((r) => r.json())
            .then((res) => {
              if (res && res.ok) setHistory(res.history || {})
            })
            .catch(() => {})
        }
        React.useEffect(() => { loadHistory() }, [])
        const deleteHistoryItem = (category, name) => {
          fetch('/__notify/history/delete', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, category }),
          })
            .then((r) => r.json())
            .then((res) => { if (res && res.ok) loadHistory() })
            .catch(() => {})
        }
        const HISTORY_LABELS = {
          bubbleBg: '泡泡背景历史',
          bubbleBorder: '泡泡边框历史',
          windowBg: '窗口背景历史',
          windowBorder: '窗口边框历史',
        }
        const userImageUrl = (name) => '/__notify/user-image?name=' + encodeURIComponent(name)
        // 历史默认折叠：最多展示 3 张（最新的在前），更多时显示「+N 张」按钮，点击展开全部
        const MAX_HISTORY_SHOW = 3
        const renderHistoryRow = (category) => {
          const raw = (history && history[category]) || []
          const list = Array.isArray(raw) ? raw : []
          const isExpanded = !!expanded[category]
          const allNewestFirst = [...list].reverse()
          const visible = isExpanded ? allNewestFirst : allNewestFirst.slice(0, MAX_HISTORY_SHOW)
          const hidden = list.length - visible.length
          return React.createElement('div', { key: 'hist-' + category, 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '', 'data-notify-history-label': '' }, HISTORY_LABELS[category]),
            React.createElement('span', { key: 't', 'data-notify-history-thumbs': '' },
              !history
                ? React.createElement('span', { key: 'e', 'data-notify-history-empty': '' }, '加载中…')
                : list.length === 0
                  ? React.createElement('span', { key: 'e', 'data-notify-history-empty': '' }, '（暂无，导入的素材会出现在这里）')
                  : [
                      ...visible.map((item) => {
                        const url = userImageUrl(item.name)
                        return React.createElement('span', { key: item.name, 'data-notify-history-item': '' }, [
                          React.createElement('img', {
                            key: 'i',
                            src: url,
                            title: item.name + '（点击应用）',
                            'data-active': appearance[category].path === url ? 'true' : 'false',
                            onClick: () => setSlot(category, 'path', url),
                          }),
                          React.createElement('button', {
                            key: 'd',
                            'data-notify-history-del': '',
                            onClick: (e) => { e.stopPropagation(); deleteHistoryItem(category, item.name) },
                            title: '删除该素材',
                          }, '✕'),
                        ])
                      }),
                      list.length > MAX_HISTORY_SHOW
                        ? React.createElement('button', {
                            key: 'fold',
                            'data-notify-history-fold-btn': '',
                            onClick: () => toggleExpand(category),
                            title: isExpanded ? '折叠，只显示前 ' + MAX_HISTORY_SHOW + ' 张' : '展开查看全部 ' + list.length + ' 张',
                          }, isExpanded ? '收起 ▲' : '+' + hidden + ' 张 ▼')
                        : null,
                    ]),
          ])
        }

        // ---------- 实时预览（窗口与历史素材之间） ----------
        // 用当前外观设置渲染一个示例泡泡：窗口背景/边框做底色，泡泡背景/边框/文字分层
        const fitStyle = (slot, opacityKey) => ({
          opacity: appearance[opacityKey] || 1,
          objectFit: slot.stretch ? 'fill' : 'contain',
        })
        const renderPreview = () => {
          const pvWindowBg = appearance.windowBg && appearance.windowBg.path
            ? React.createElement('img', {
                key: 'wbg', 'data-notify-preview-window-bg': '',
                src: imgUrl(appearance.windowBg.path),
                style: fitStyle(appearance.windowBg, 'windowBgOpacity'),
                draggable: false,
              })
            : null
          const pvWindowBorder = appearance.windowBorder && appearance.windowBorder.path
            ? React.createElement('img', {
                key: 'wbd', 'data-notify-preview-window-border': '',
                src: imgUrl(appearance.windowBorder.path),
                style: fitStyle(appearance.windowBorder, 'windowBorderOpacity'),
                draggable: false,
              })
            : null
          const pvBubbleBg = appearance.bubbleBg && appearance.bubbleBg.path
            ? React.createElement('img', {
                key: 'bbg', 'data-notify-preview-bg': '',
                src: imgUrl(appearance.bubbleBg.path),
                style: fitStyle(appearance.bubbleBg, 'bubbleBgOpacity'),
                draggable: false,
              })
            : null
          const pvBubbleBorder = appearance.bubbleBorder && appearance.bubbleBorder.path
            ? React.createElement('img', {
                key: 'bbd', 'data-notify-preview-border': '',
                src: imgUrl(appearance.bubbleBorder.path),
                style: fitStyle(appearance.bubbleBorder, 'bubbleBorderOpacity'),
                draggable: false,
              })
            : null
          return React.createElement('div', { key: 'pv', 'data-notify-appearance-preview': '' }, [
            React.createElement('div', { key: 'cap', 'data-notify-preview-caption': '' }, '👀 实时预览：改素材/透明度/文字立即生效'),
            React.createElement('div', { key: 'win', 'data-notify-preview-window': '' }, [
              pvWindowBg,
              pvWindowBorder,
              React.createElement('div', {
                key: 'bub',
                'data-notify-preview-bubble': '',
                style: { padding: appearance.padding },
              }, [
                pvBubbleBg,
                pvBubbleBorder,
                React.createElement('div', {
                  key: 'txt',
                  'data-notify-preview-text': '',
                  style: { color: appearance.textColor, padding: appearance.padding },
                }, '示例提醒：这是一条预览消息 🔔'),
              ]),
            ]),
          ])
        }

        // 图片槽渲染器（一个槽 = 路径输入 + 文件选择 + 拉伸开关）
        const renderSlot = (label, slotKey) => {
          const slot = appearance[slotKey]
          const fileInputId = 'notify-file-' + slotKey
          return React.createElement('div', { key: slotKey, 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, label),
            React.createElement('input', {
              key: 'p',
              'data-notify-appearance-input': '',
              value: slot.path,
              placeholder: '图片路径或 /__notify/assets/...',
              onChange: (e) => setSlot(slotKey, 'path', e.target.value),
            }),
            React.createElement('input', {
              key: 'f',
              type: 'file',
              id: fileInputId,
              accept: 'image/png,image/jpeg,image/webp',
              style: { display: 'none' },
              onChange: (e) => {
                const file = e.target.files && e.target.files[0]
                if (file) {
                  // 读为 dataURL 后上传到 host 持久化，返回可复用 URL（重启不丢，不占 localStorage）
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = String(reader.result)
                    fetch('/__notify/import-image', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ dataUrl, category: slotKey }),
                    })
                      .then((r) => r.json())
                      .then((res) => {
                        if (res && res.ok && res.url) {
                          setImportError('')
                          setSlot(slotKey, 'path', res.url)
                          loadHistory()
                        } else {
                          setImportError('素材导入失败：' + ((res && res.error) || '未知错误'))
                        }
                      })
                      .catch(() => setImportError('素材导入失败：网络错误'))
                  }
                  reader.readAsDataURL(file)
                }
                // 清空文件选择框：否则再次选择同一个文件不会触发 change，重复导入会"没反应"
                e.target.value = ''
              },
            }),
            React.createElement('button', {
              key: 'b',
              'data-notify-appearance-btn': '',
              onClick: () => { const el = document.getElementById(fileInputId); if (el) el.click() },
            }, '选择文件'),
            React.createElement('label', { key: 's' }, [
              React.createElement('input', {
                type: 'checkbox',
                checked: !!slot.stretch,
                onChange: (e) => setSlot(slotKey, 'stretch', e.target.checked),
              }),
              ' 自动拉伸',
            ]),
          ])
        }

        return React.createElement('div', {
          'data-notify-appearance': '',
          style: props.transparent ? { background: 'transparent' } : null,
        }, [
          React.createElement('div', { key: 't', 'data-notify-appearance-title': '' }, '🎨 外观设置 v2（历史折叠+展开）'),
          // 预设
          React.createElement('div', { key: 'ps', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '预设'),
            ...PRESETS.map((p) => React.createElement('button', {
              key: p.id,
              'data-notify-appearance-btn': '',
              'data-active': appearance.preset === p.id ? 'true' : 'false',
              onClick: () => applyPreset(p),
            }, p.name)),
          ]),
          React.createElement('div', { key: 'sep1', 'data-notify-appearance-sep': '' }),
          // 自定义：泡泡背景/边框
          React.createElement('div', { key: 'bt', 'data-notify-appearance-title': '' }, '泡泡'),
          renderSlot('背景', 'bubbleBg'),
          renderSlot('边框', 'bubbleBorder'),
          React.createElement('div', { key: 'bbo', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '背景透明度'),
            React.createElement('input', {
              key: 'r', type: 'range', min: 0, max: 1, step: 0.05,
              'data-notify-appearance-range': '',
              value: appearance.bubbleBgOpacity,
              onChange: (e) => setNum('bubbleBgOpacity', e.target.value),
            }),
          ]),
          React.createElement('div', { key: 'bbr', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '边框透明度'),
            React.createElement('input', {
              key: 'r', type: 'range', min: 0, max: 1, step: 0.05,
              'data-notify-appearance-range': '',
              value: appearance.bubbleBorderOpacity,
              onChange: (e) => setNum('bubbleBorderOpacity', e.target.value),
            }),
          ]),
          React.createElement('div', { key: 'sep2', 'data-notify-appearance-sep': '' }),
          // 窗口背景/边框
          React.createElement('div', { key: 'wt', 'data-notify-appearance-title': '' }, '窗口'),
          renderSlot('背景', 'windowBg'),
          renderSlot('边框', 'windowBorder'),
          React.createElement('div', { key: 'wbo', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '背景透明度'),
            React.createElement('input', {
              key: 'r', type: 'range', min: 0, max: 1, step: 0.05,
              'data-notify-appearance-range': '',
              value: appearance.windowBgOpacity,
              onChange: (e) => setNum('windowBgOpacity', e.target.value),
            }),
          ]),
          React.createElement('div', { key: 'wbr', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '边框透明度'),
            React.createElement('input', {
              key: 'r', type: 'range', min: 0, max: 1, step: 0.05,
              'data-notify-appearance-range': '',
              value: appearance.windowBorderOpacity,
              onChange: (e) => setNum('windowBorderOpacity', e.target.value),
            }),
          ]),
          React.createElement('div', { key: 'sep3', 'data-notify-appearance-sep': '' }),
          // 文字
          React.createElement('div', { key: 'txt', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '文字颜色'),
            ...TEXT_COLORS.map((c) => React.createElement('button', {
              key: c,
              'data-notify-appearance-color': '',
              style: { background: c },
              'data-active': appearance.textColor === c ? 'true' : 'false',
              onClick: () => setTextColor(c),
              title: c,
            })),
          ]),
          // 色号输入 + 取色器（自定义任意颜色）
          React.createElement('div', { key: 'txth', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '色号'),
            React.createElement('input', {
              key: 'hex',
              'data-notify-appearance-input': '',
              value: textColorDraft,
              placeholder: '#RRGGBB 如 #ff6600',
              spellCheck: false,
              onChange: (e) => {
                const v = e.target.value
                setTextColorDraft(v)
                if (isValidHex(v)) setTextColor(v.toLowerCase())
              },
              onBlur: () => setTextColorDraft(normalizeHex(appearance.textColor)),
            }),
            React.createElement('input', {
              key: 'sw',
              type: 'color',
              value: normalizeHex(appearance.textColor),
              onChange: (e) => setTextColor(e.target.value),
              title: '取色器',
            }),
          ]),
          React.createElement('div', { key: 'pad', 'data-notify-appearance-row': '' }, [
            React.createElement('span', { key: 'l', 'data-notify-appearance-label': '' }, '文字页边距'),
            React.createElement('input', {
              key: 'r', type: 'range', min: 0, max: 30, step: 1,
              'data-notify-appearance-range': '',
              value: appearance.padding,
              onChange: (e) => setNum('padding', e.target.value),
            }),
            React.createElement('span', { key: 'v' }, appearance.padding + 'px'),
          ]),
          // 实时预览（窗口与历史素材之间）
          renderPreview(),
          React.createElement('div', { key: 'sep4', 'data-notify-appearance-sep': '' }),
          // 历史素材（按分类缩略图，点击应用 / ✕ 删除）
          React.createElement('div', { key: 'ht', 'data-notify-appearance-title': '' }, '历史素材'),
          renderHistoryRow('bubbleBg'),
          renderHistoryRow('bubbleBorder'),
          renderHistoryRow('windowBg'),
          renderHistoryRow('windowBorder'),
          importError
            ? React.createElement('div', { key: 'importerr', 'data-notify-import-error': '' }, importError)
            : null,
          React.createElement('div', { key: 'done', 'data-notify-appearance-row': '' }, [
            React.createElement('button', {
              key: 'b',
              'data-notify-appearance-btn': '',
              onClick: () => { store.appearanceOpen = false; notify() },
            }, '完成'),
          ]),
        ])
      }

      // ---------- 注册槽位 ----------
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register(
        { name: 'conversation.input.right', id: 'notify-bubble', order: 200, label: '提醒' },
        (props) => React.createElement(BubbleEntry, { sessionId: props.sessionId }),
      ))

      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register(
        { name: 'conversation.input.overlay', id: 'notify-bubble', order: 30, label: '提醒面板' },
        (props) => React.createElement(BubblePanel, { sessionId: props.sessionId }),
      ))

      ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
        { name: 'conversation.input.left', id: 'notify-restart', order: 10, label: '快速重启' },
        (props) => React.createElement(RestartButton, { sessionId: props.sessionId }),
      ))

      return () => {
        try { if (disposeProvide) disposeProvide() } catch { /* 忽略 */ }
        if (styleTag && styleTag.parentNode) {
          try { styleTag.parentNode.removeChild(styleTag) } catch { /* 忽略 */ }
        }
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
