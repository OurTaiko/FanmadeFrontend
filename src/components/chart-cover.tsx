import { useState } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { CoverPicker } from './cover-picker'
import { Modal } from '../notifications'
import { api } from '../api'
import type { Chart } from '../api'
import { coverSource } from '../cover'
import { useSession } from '../session-context'

export function ChartCover({
  chart,
  onSaved,
}: {
  chart: Chart
  onSaved: (coverHash: string) => void
}) {
  const session = useSession()
  const [editing, setEditing] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failedSource, setFailedSource] = useState('')
  const source = coverSource(chart)
  const available = source && failedSource !== source
  const close = () => {
    setEditing(false)
    setFile(null)
    setError('')
  }
  const save = async () => {
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('cover', file)
      const result = await api<{ coverHash: string }>(
        `/charts/${encodeURIComponent(chart.id)}/cover`,
        {
          method: 'PUT',
          headers: { 'X-CSRF-Token': session.csrfToken },
          body: form,
        },
      )
      onSaved(result.coverHash)
      setFailedSource('')
      close()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="w-full min-w-0 space-y-3 sm:w-56 sm:shrink-0">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[#f5f5f7] dark:bg-muted">
        {available ? (
          <img
            src={source}
            alt={`${chart.title}的封面`}
            className="size-full object-contain"
            onError={() => setFailedSource(source)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon size={32} aria-hidden="true" />
            <span>{source ? '封面暂时无法加载' : '暂无封面'}</span>
          </div>
        )}
      </div>
      {session.user?.id === chart.ownerId && (
        <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
          {source ? '修改封面' : '添加封面'}
        </Button>
      )}
      {editing && (
        <Modal
          title="修改歌曲封面"
          busy={busy}
          onDismiss={close}
          actions={
            <Button disabled={!file || busy} onClick={() => void save()}>
              {busy ? '正在保存…' : '保存封面'}
            </Button>
          }
        >
          <CoverPicker
            file={file}
            onChange={(file) => {
              setFile(file)
              setError('')
            }}
            disabled={busy}
          />
          <p className="text-sm text-muted-foreground">
            保存成功后替换当前封面，谱面、音频和成绩保持不变。
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
