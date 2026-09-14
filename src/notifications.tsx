import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { NotificationContext, useNotification } from './notification-context'
import type { Notification, NoticeKind } from './notification-context'

export function Modal({
  title,
  children,
  actions,
  onDismiss,
  busy = false,
  alert = false,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
  onDismiss: () => void
  busy?: boolean
  alert?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const node = ref.current!
    const previous = document.activeElement as HTMLElement | null
    node.showModal()
    return () => {
      node.close()
      if (previous?.isConnected && previous !== document.body) {
        previous.focus({ preventScroll: true })
      } else {
        // Async submit buttons may lose focus while disabled. Keep keyboard
        // focus in the underlying editor when dismissing its error message.
        document
          .querySelector<HTMLElement>('dialog[open]:not(.feedback-dialog) input:not(:disabled)')
          ?.focus({ preventScroll: true })
      }
    }
  }, [])
  return createPortal(
    <dialog
      ref={ref}
      className="feedback-dialog"
      role={alert ? 'alertdialog' : 'dialog'}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onDismiss()
      }}
    >
      <header>
        <h2 id={`${id}-title`}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="关闭提示"
          disabled={busy}
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
      </header>
      <div id={`${id}-message`} className="feedback-message">
        {children}
      </div>
      <footer>
        {actions ?? (
          <button type="button" className="button primary" onClick={onDismiss}>
            知道了
          </button>
        )}
      </footer>
    </dialog>,
    document.body,
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(Notification & { id: string })[]>([])
  const sequence = useRef(0)
  const dismiss = useCallback(
    (id: string) => setQueue((items) => items.filter((item) => item.id !== id)),
    [],
  )
  const publish = useCallback((id: string, notice: Notification) => {
    setQueue((items) => {
      if (!items.some((item) => item.id === id)) return [...items, { ...notice, id }]
      return items.map((item) => (item.id === id ? { ...notice, id } : item))
    })
  }, [])
  const notify = useCallback(
    (message: ReactNode, kind: NoticeKind = 'info', title = '') => {
      publish(`event-${++sequence.current}`, { message, kind, title })
    },
    [publish],
  )
  const value = useMemo(() => ({ publish, dismiss, notify }), [publish, dismiss, notify])
  const current = queue[0]
  const Icon =
    current?.kind === 'error' ? CircleAlert : current?.kind === 'success' ? CheckCircle2 : Info
  return (
    <NotificationContext.Provider value={value}>
      {children}
      {current && (
        <Modal
          key={current.id}
          title={
            current.title ||
            (current.kind === 'error'
              ? '操作未完成'
              : current.kind === 'success'
                ? '操作成功'
                : '提示')
          }
          alert={current.kind === 'error'}
          onDismiss={() => dismiss(current.id)}
        >
          <div className={`feedback-content ${current.kind}`}>
            <Icon size={26} aria-hidden="true" />
            <div>{current.message}</div>
          </div>
        </Modal>
      )}
    </NotificationContext.Provider>
  )
}

// Unmounting a source (navigation, retry, changed selection) removes its queued message.
export function Notice({
  children,
  kind = 'error',
  title = '',
}: {
  children: ReactNode
  kind?: NoticeKind
  title?: string
}) {
  const { publish, dismiss } = useNotification()
  const id = useId()
  useEffect(() => {
    publish(id, { message: children, kind, title })
    return () => dismiss(id)
  }, [children, kind, title, id, publish, dismiss])
  return null
}
