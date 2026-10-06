import playerBuild from '../player-build.json'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { endpoints } from '@/api/endpoints'
import type { Chart } from '@/api/types'
import {
  isPlayerMessage,
  playerChannel,
  playerLoad,
  type PlayerMode,
} from './embedded-player-protocol'

export default function EmbeddedPlayer({
  chart,
  source,
  course,
}: {
  chart: Chart
  source: string
  course: string
}) {
  const { t } = useTranslation()
  const chartId = chart.id
  const audioType = chart.audioName.split('.').pop()?.toLowerCase() || 'ogg'
  const iframe = useRef<HTMLIFrameElement>(null)
  const request = useRef('')
  const [mode, setMode] = useState<PlayerMode | null>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const url = new URL(import.meta.env.VITE_PLAYER_URL || playerBuild.path, window.location.href)
  url.searchParams.set('parentOrigin', window.location.origin)
  const playerOrigin = url.origin
  const playerUrl = url.href
  const send = useCallback(
    (type: string) => {
      iframe.current?.contentWindow?.postMessage(
        { channel: playerChannel, version: 1, type, requestId: request.current },
        playerOrigin,
      )
    },
    [playerOrigin],
  )

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!isPlayerMessage(event, iframe.current?.contentWindow ?? null, playerOrigin)) return
      const data = event.data
      if (data.type === 'ready') {
        setReady(true)
        return
      }
      if (data.requestId && data.requestId !== request.current) return
      if (data.type === 'error') {
        setError(
          data.payload?.detail
            ? `${data.payload.code}: ${data.payload.detail}`
            : data.payload?.code || 'PLAYER_ERROR',
        )
        setStatus('error')
      } else if (data.type === 'exit') {
        setMode(null)
        setReady(false)
        setStatus('idle')
      } else if (['loading', 'loaded', 'finished'].includes(data.type)) setStatus(data.type)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [playerOrigin])

  useEffect(() => {
    if (!ready || !mode || !source) return
    const id = crypto.randomUUID()
    request.current = id
    setError('')
    setStatus('loading')
    const audio = new URL(endpoints.resource({ id: chartId }, 'audio'), window.location.href).href
    iframe.current?.contentWindow?.postMessage(
      playerLoad(id, source, audio, course, mode, audioType),
      playerOrigin,
    )
  }, [ready, mode, source, chartId, course, playerOrigin, audioType])

  useEffect(() => {
    if (!mode || ready || error) return
    const timeout = window.setTimeout(() => {
      setError('PLAYER_BOOT_TIMEOUT')
      setStatus('error')
    }, 120_000)
    return () => window.clearTimeout(timeout)
  }, [mode, ready, error, attempt])

  function choose(value: PlayerMode) {
    if (mode && mode !== value) send('pause')
    setMode(value)
  }
  function reload() {
    setReady(false)
    setError('')
    setStatus('loading')
    setAttempt((n) => n + 1)
  }
  return (
    <section className="space-y-4" aria-label={t('messages.chartPreview')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={mode === 'practice' ? 'default' : 'outline'}
          disabled={!source || status === 'loading'}
          onClick={() => choose('practice')}
        >
          {t('messages.playerPractice')}
        </Button>
        <Button
          variant={mode === 'auto' ? 'default' : 'outline'}
          disabled={!source || status === 'loading'}
          onClick={() => choose('auto')}
        >
          {t('messages.playerWatch')}
        </Button>
        {mode && (
          <Button
            variant="ghost"
            onClick={() => {
              send('unload')
              setMode(null)
              setReady(false)
              setStatus('idle')
              setError('')
            }}
          >
            {t('messages.playerClose')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('messages.playerHelp')}</p>
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            {t('messages.playerFailed')} ({error})
          </span>
          <Button variant="outline" onClick={reload}>
            {t('messages.reload')}
          </Button>
        </div>
      )}
      {mode && (
        <Button
          variant="outline"
          onClick={() => {
            void iframe.current?.requestFullscreen().catch(() => setError('FULLSCREEN_UNAVAILABLE'))
          }}
        >
          {t('messages.playerFullscreen')}
        </Button>
      )}
      {status === 'finished' && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('messages.playerFinished')}
        </p>
      )}
      {mode ? (
        <iframe
          key={attempt}
          ref={iframe}
          src={playerUrl}
          title={t('messages.chartPreview')}
          className="aspect-video w-full rounded-xl border bg-black"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={() => send('hello')}
        />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
          {t('messages.playerChoose')}
        </div>
      )}
    </section>
  )
}
