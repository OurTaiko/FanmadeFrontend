import { endpoints } from '@/api/endpoints'
import { DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react'
import { CategoryPicker } from './categories'
import { api, jsonRequest } from './api/client'
import type { Chart, Locale } from './api/types'
import { useNotification } from './notification-context'
import { Modal } from './notifications'

const languages = [
  { code: 'en', label: '英文', caption: '默认显示' },
  { code: 'ja', label: '日文', caption: '日本語' },
  { code: 'zh', label: '中文', caption: '中文' },
  { code: 'ko', label: '韩文', caption: '한국어' },
] as const
type Language = 'en' | Locale
type Draft = Record<Language, { title: string; subtitle: string; restore: boolean }>
type Patch = {
  categoryIds?: string[]
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
  const [categoryIds, setCategoryIds] = useState<string[]>(chart.categoryIds ?? [])
  const categoriesChanged =
    [...categoryIds].sort().join() !== [...(chart.categoryIds ?? [])].sort().join()
  const [busy, setBusy] = useState(false)
  const { notify } = useNotification()
  const setError = (message: string) => notify(message, 'error')
  const firstInput = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  const changed =
    categoriesChanged ||
    languages.some(
      ({ code }) =>
        draft[code].restore ||
        draft[code].title !== initial(code).title ||
        draft[code].subtitle !== initial(code).subtitle,
    )
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (request.current || !changed) return
    const patch: Patch = categoriesChanged ? { categoryIds } : {}
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
      const updated = await api<Chart>(endpoints.chart(chart.id), {
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
    <Modal
      title="编辑谱面信息"
      initialFocus={firstInput}
      busy={busy}
      onDismiss={onDismiss}
      actions={null}
      className="sm:max-w-3xl"
    >
      <form onSubmit={submit} aria-busy={busy}>
        <div className="space-y-6">
          <p id="edit-metadata-hint" className="text-sm text-muted-foreground">
            修改分类、名称和副标题。已保存的成绩不受影响，下载文件保留原内容。
          </p>
          <CategoryPicker value={categoryIds} disabled={busy} onChange={setCategoryIds} />
          {languages.map(({ code, label, caption }) => (
            <fieldset
              key={code}
              className="min-w-0 space-y-4 rounded-2xl border p-4 [&>legend]:px-2 [&>legend]:font-medium [&>legend_span]:ml-2 [&>legend_span]:text-xs [&>legend_span]:text-muted-foreground"
              disabled={busy}
            >
              <legend>
                {label}
                <span>{caption}</span>
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 [&>label]:flex [&>label]:flex-col [&>label]:items-start [&>label]:gap-2">
                <Label htmlFor={`edit-${code}-title`}>
                  {label}歌名
                  <Input
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
                </Label>
                <Label htmlFor={`edit-${code}-subtitle`}>
                  {label}副标题
                  <Input
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
                </Label>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between [&>small]:text-muted-foreground">
                <small>
                  {draft[code].restore
                    ? '保存后恢复文件中的名称和副标题'
                    : code === 'en'
                      ? '英文歌名必填，副标题可清空'
                      : '清空译名会恢复文件中的原值；副标题可清空'}
                </small>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({ ...d, [code]: { ...d[code], restore: !d[code].restore } }))
                  }
                >
                  <RotateCcw size={13} />
                  {draft[code].restore ? `撤销${label}恢复` : `恢复${label}原值`}
                </Button>
              </div>
            </fieldset>
          ))}
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4 [&>span]:mr-auto">
          <span className="text-sm text-muted-foreground">
            {busy ? '正在保存…' : changed ? '有尚未保存的修改' : '修改后即可保存'}
          </span>
          <DialogClose
            render={<Button type="button" variant="outline" size="default" />}
            disabled={busy}
          >
            取消
          </DialogClose>
          <Button type="submit" variant="default" size="default" disabled={busy || !changed}>
            {busy ? '保存中…' : '保存修改'}
          </Button>
        </footer>
      </form>
    </Modal>
  )
}
