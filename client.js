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
  z-index: 2000;
  background: transparent;
  color: var(--dsw-alias-label-primary, #111);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 160px;
  min-height: 120px;
}
[data-notify-bubble-list] {
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
  border: 1px solid var(--dsw-alias-border-l2, #d0d0d0);
  border-radius: 10px;
  padding: 8px 34px 8px 10px;
  font-size: 13px;
  line-height: 1.5;
  max-height: calc(6 * 1.5em + 16px);
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--dsw-alias-bg-layer-2, #f7f7f8);
  color: var(--dsw-alias-label-primary, #111);
  cursor: default;
  user-select: text;
}
[data-notify-bubble-item]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary, #4a9eff);
}
[data-notify-bubble-source] {
  display: block;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #666);
  margin-bottom: 2px;
}
[data-notify-bubble-copy] {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #888);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
[data-notify-bubble-copy]:hover { background: var(--dsw-alias-bg-layer-1, #eee); color: var(--dsw-alias-label-primary, #111); }
[data-notify-bubble-link] {
  color: var(--dsw-alias-brand-primary, #4a9eff);
  text-decoration: underline;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
}
[data-notify-bubble-footer] {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--dsw-alias-border-l1, #e0e0e0);
  flex-wrap: wrap;
  background: transparent;
}
[data-notify-bubble-toggle] {
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #555);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
[data-notify-bubble-toggle]:hover { background: var(--dsw-alias-bg-layer-2, #eee); color: var(--dsw-alias-label-primary, #111); }
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
              const gap = 10
              left = cr.right + gap
              const avail = vw - cr.right - gap - 8
              autoWidth = Math.max(160, Math.min(340, avail))
            } else {
              left = vw - 350
              autoWidth = 300
            }
            const maxToTop = vh - 16
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
        }
        return React.createElement('div', {
          'data-notify-bubble-panel': '',
          'data-expanded': expanded ? 'true' : 'false',
          style,
        }, [
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
            return React.createElement('div', {
              key: item.id,
              'data-notify-bubble-item': '',
              onDoubleClick: () => setExpanded((v) => !v),
              title: '双击展开/收起',
            }, [
              sourceEl,
              item.text,
              linkEl,
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
      function RestartButton(props) {
        const [busy, setBusy] = React.useState(false)
        const doRestart = () => {
          if (busy) return
          setBusy(true)
          fetch('/dsh-market/restart', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          }).then((res) => {
            if (res.status === 202 || res.ok) {
              // 重启已安排：提示用户稍等
            } else {
              setBusy(false)
            }
          }).catch(() => { setBusy(false) })
        }
        return React.createElement('button', {
          'data-notify-restart-btn': '',
          'data-busy': busy ? 'true' : 'false',
          onClick: doRestart,
          title: '快速重启 DeepSeek Harness（调用 /dsh-market/restart）',
        }, [
          React.createElement('span', { key: 'i' }, busy ? '⏳' : '🔄'),
          React.createElement('span', { key: 't' }, busy ? '重启中…' : '重启'),
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
