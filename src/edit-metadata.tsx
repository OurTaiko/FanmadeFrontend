import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { api, jsonRequest } from './api'
import type { Chart, Locale } from './api'
import { Notice } from './components'

const languages = [
  { code: 'en', label: '英文', caption: '默认显示' },
  { code: 'ja', label: '日文', caption: '日本語' },
  { code: 'zh', label: '中文', caption: '中文' },
  { code: 'ko', label: '韩文', caption: '한국어' },
] as const
type Language = 'en' | Locale
type Draft = Record<Language, { title: string; subtitle: string; restore: boolean }>
type Patch = {
  title?: string | null
  subtitle?: string | null
  titleTranslations?: Partial<Record<Locale, string | null>>
  subtitleTranslations?: Partial<Record<Locale, string | null>>
}

export function EditMetadata({
  chart,
  csrf,
  onSaved,
  onDismiss,
}: {
  chart: Chart
  csrf: string
  onSaved: (chart: Chart) => void
  onDismiss: () => void
}) {
  const initial = (code: Language) => ({
    title: code === 'en' ? chart.title : (chart.titleTranslations[code] ?? ''),
    subtitle: code === 'en' ? chart.subtitle : (chart.subtitleTranslations[code] ?? ''),
    restore: false,
  })
  const [draft, setDraft] = useState<Draft>(() => ({
    en: initial('en'),
    ja: initial('ja'),
    zh: initial('zh'),
    ko: initial('ko'),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const node = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    node.showModal()
    firstInput.current?.focus({ preventScroll: true })
    return () => {
      request.current?.abort()
      node.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  const changed = languages.some(
    ({ code }) =>
      draft[code].restore ||
      draft[code].title !== initial(code).title ||
      draft[code].subtitle !== initial(code).subtitle,
  )
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (request.current || !changed) return
    setError('')
    const patch: Patch = {}
    for (const { code, label } of languages) {
      const current = draft[code],
        original = initial(code)
      for (const field of ['title', 'subtitle'] as const) {
        if (!current.restore && current[field] === original[field]) continue
        const text = current[field].trim()
        if (
          !current.restore &&
          (new TextEncoder().encode(text).length > 500 ||
            Array.from(text).some((char) => {
              const code = char.codePointAt(0)!
              return code < 32 || (code >= 127 && code <= 159)
            }))
        ) {
          setError(
            `${label}${field === 'title' ? '歌名' : '副标题'}过长或含有无效字符，请缩短后重试。`,
          )
          return
        }
        if (code === 'en') {
          if (!current.restore && field === 'title' && !text) {
            setError('英文歌名不能为空。')
            return
          }
          patch[field] = current.restore ? null : text
        } else {
          const key = field === 'title' ? 'titleTranslations' : 'subtitleTranslations'
          patch[key] = {
            ...patch[key],
            [code]: current.restore || (field === 'title' && !text) ? null : text,
          }
        }
      }
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      const updated = await api<Chart>(`/charts/${chart.id}`, {
        ...jsonRequest('PATCH', patch, csrf),
        signal: controller.signal,
      })
      onSaved(updated)
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message)
    } finally {
      request.current = null
      setBusy(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="metadata-dialog"
      aria-labelledby="edit-metadata-title"
      aria-describedby="edit-metadata-hint"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onDismiss()
      }}
    >
      <form onSubmit={submit} aria-busy={busy}>
        <header className="metadata-dialog-header">
          <div>
            <div className="eyebrow">CHART INFORMATION</div>
            <h2 id="edit-metadata-title">编辑谱面信息</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭编辑"
            disabled={busy}
            onClick={onDismiss}
          >
            <X size={20} />
          </button>
        </header>
        <div className="metadata-dialog-content">
          <p id="edit-metadata-hint" className="muted">
            修改网站显示的名称和副标题。已保存的成绩不受影响，下载文件保留原内容。
          </p>
          {languages.map(({ code, label, caption }) => (
            <fieldset key={code} className="metadata-language" disabled={busy}>
              <legend>
                {label}
                <span>{caption}</span>
              </legend>
              <div className="metadata-field-grid">
                <label htmlFor={`edit-${code}-title`}>
                  {label}歌名
                  <input
                    id={`edit-${code}-title`}
                    value={draft[code].title}
                    required={code === 'en' && !draft[code].restore}
                    disabled={draft[code].restore}
                    maxLength={500}
                    autoComplete="off"
                    ref={code === 'en' ? firstInput : undefined}
                    placeholder={code === 'en' ? '默认英文歌名' : '未填写翻译'}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [code]: { ...d[code], title: e.target.value } }))
                    }
                  />
                </label>
                <label htmlFor={`edit-${code}-subtitle`}>
                  {label}副标题
                  <input
                    id={`edit-${code}-subtitle`}
                    value={draft[code].subtitle}
                    disabled={draft[code].restore}
                    maxLength={500}
                    autoComplete="off"
                    placeholder="可留空"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [code]: { ...d[code], subtitle: e.target.value } }))
                    }
                  />
                </label>
              </div>
              <div className="metadata-restore-row">
                <small>
                  {draft[code].restore
                    ? '保存后恢复文件中的名称和副标题'
                    : code === 'en'
                      ? '英文歌名必填，副标题可清空'
                      : '清空译名会恢复文件中的原值；副标题可清空'}
                </small>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() =>
                    setDraft((d) => ({ ...d, [code]: { ...d[code], restore: !d[code].restore } }))
                  }
                >
                  <RotateCcw size={13} />
                  {draft[code].restore ? `撤销${label}恢复` : `恢复${label}原值`}
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        {error && (
          <div className="metadata-dialog-error">
            <Notice>{error}</Notice>
          </div>
        )}
        <footer className="metadata-dialog-footer">
          <span className="muted">
            {busy ? '正在保存…' : changed ? '有尚未保存的修改' : '修改后即可保存'}
          </span>
          <button type="button" className="button secondary" disabled={busy} onClick={onDismiss}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={busy || !changed}>
            {busy ? '保存中…' : '保存修改'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
