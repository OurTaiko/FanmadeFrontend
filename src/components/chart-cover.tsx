import { chartText } from '@/chart-language'
import { i18n } from '@/i18n'
import { useTranslation } from 'react-i18next'
import { endpoints } from '@/api/endpoints'
import { useState } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CoverPicker } from './cover-picker'
import { Modal } from '../notifications'
import { api } from '../api/client'
import type { Chart } from '../api/types'
import { coverSource } from '../cover'
import { useSession } from '../session-context'

export function ChartCover({ chart, className }: { chart: Chart; className?: string }) {
  const { t } = useTranslation()

  const [failedSource, setFailedSource] = useState('')
  const source = coverSource(chart)
  const available = source && failedSource !== source
  return (
    <div
      className={cn(
        'flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[#f5f5f7] dark:bg-muted',
        className,
      )}
    >
      {available ? (
        <img
          src={source}
          alt={t('messages.songCoverAlt', {
            title: chartText(chart, i18n.resolvedLanguage).title,
          })}
          className="size-full object-contain"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 p-2 text-center text-xs text-muted-foreground sm:text-sm">
          <ImageIcon className="size-6 sm:size-8" aria-hidden="true" />
          <span>{source ? t('messages.coverTemporarilyUnavailable') : t('messages.noCover')}</span>
        </div>
      )}
    </div>
  )
}

// Owners and administrators replace covers from the chart page's management actions.
export function CoverDialog({
  chart,
  onSaved,
  onDismiss,
}: {
  chart: Chart
  onSaved: (coverHash: string) => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()

  const session = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('cover', file)
      const result = await api<{ coverHash: string }>(endpoints.cover(chart.id), {
        method: 'PUT',
        headers: { 'X-CSRF-Token': session.csrfToken },
        body: form,
      })
      onSaved(result.coverHash)
      onDismiss()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={t('messages.changeSongCover')}
      busy={busy}
      onDismiss={onDismiss}
      actions={
        <Button disabled={!file || busy} onClick={() => void save()}>
          {busy ? t('messages.saving') : t('messages.saveCover')}
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
        {t('messages.savingReplacesTheCoverChartsAudioAndScoresStayIntact')}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Modal>
  )
}
