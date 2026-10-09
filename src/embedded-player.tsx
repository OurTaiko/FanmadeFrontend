import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { endpoints } from '@/api/endpoints'
import type { Chart } from '@/api/types'
import { resolvePlayerUrl } from './embedded-player-source'
import {
  defaultDrumVolume,
  isPlayerMessage,
  playerChannel,
  playerDrumVolume,
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
  const [drumVolume, setDrumVolume] = useState(defaultDrumVolume)
  const drumVolumeRef = useRef(defaultDrumVolume)
  const [playerUrl, setPlayerUrl] = useState('')
  const playerOrigin = playerUrl ? new URL(playerUrl).origin : window.location.origin
  const opened = mode !== null

  useEffect(() => {
    if (!opened) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    async function resolvePlayer() {
      try {
        const url = await resolvePlayerUrl({
          manifestUrl:
            import.meta.env.VITE_PLAYER_MANIFEST_URL ||
            'https://d2mguycu233w0q.cloudfront.net/player-build.json',
          parentOrigin: window.location.origin,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setPlayerUrl(url)
      } catch {
        if (!disposed) {
          setError('PLAYER_MANIFEST_UNAVAILABLE')
          setStatus('error')
        }
      } finally {
        window.clearTimeout(timeout)
      }
    }
    let disposed = false
    void resolvePlayer()
    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [opened, attempt])
  const send = useCallback(
    (type: string) => {
      iframe.current?.contentWindow?.postMessage(
        { channel: playerChannel, type, requestId: request.current },
        playerOrigin,
      )
    },
    [playerOrigin],
  )
  const sendDrumVolume = useCallback(
    (volume: number) => {
      iframe.current?.contentWindow?.postMessage(
        playerDrumVolume(request.current, volume),
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
        // A new or reloaded player starts at the default; keep the chosen volume.
        sendDrumVolume(drumVolumeRef.current)
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
        setPlayerUrl('')
        setReady(false)
        setStatus('idle')
      } else if (['loading', 'loaded', 'finished'].includes(data.type)) setStatus(data.type)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [playerOrigin, sendDrumVolume])

  useEffect(() => {
    if (!ready || !mode || !source) return
    const id = crypto.randomUUID()
    request.current = id
    setError('')
    setStatus('loading')
    const audio = new URL(endpoints.resource({ id: chartId }, 'audio'), window.location.href).href
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    async function load() {
      try {
        // Only the host downloads public audio. No cookies or cross-origin redirects
        // are forwarded to the CDN iframe; transfer the encoded bytes themselves.
        const response = await fetch(audio, {
          signal: controller.signal,
          credentials: 'omit',
          mode: 'same-origin',
          redirect: 'error',
        })
        if (!response.ok) throw new Error('AUDIO_DOWNLOAD_FAILED')
        const limit = 100 * 1024 * 1024
        if (Number(response.headers.get('Content-Length')) > limit)
          throw new Error('AUDIO_TOO_LARGE')
        const bytes = await response.arrayBuffer()
        if (!bytes.byteLength || bytes.byteLength > limit) throw new Error('INVALID_AUDIO_SIZE')
        if (controller.signal.aborted || request.current !== id) return
        iframe.current?.contentWindow?.postMessage(
          playerLoad(id, source, bytes, course, mode!, audioType),
          playerOrigin,
          [bytes],
        )
      } catch (error) {
        if (disposed || request.current !== id) return
        setError(error instanceof Error ? error.message : 'AUDIO_DOWNLOAD_FAILED')
        setStatus('error')
      } finally {
        window.clearTimeout(timeout)
      }
    }
    let disposed = false
    void load()
    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timeout)
    }
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
    setPlayerUrl('')
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
              setPlayerUrl('')
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
      {mode && (
        <div className="flex max-w-sm items-center gap-3 text-sm">
          <span className="shrink-0">{t('messages.playerDrumVolume')}</span>
          <Slider
            aria-label={t('messages.playerDrumVolume')}
            value={[drumVolume]}
            min={0}
            max={100}
            step={1}
            onValueChange={(value) => {
              const next = typeof value === 'number' ? value : value[0]
              drumVolumeRef.current = next
              setDrumVolume(next)
              sendDrumVolume(next)
            }}
          />
          <span className="w-9 shrink-0 text-right tabular-nums">{drumVolume}</span>
        </div>
      )}
      {status === 'finished' && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('messages.playerFinished')}
        </p>
      )}
      {mode && playerUrl ? (
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
