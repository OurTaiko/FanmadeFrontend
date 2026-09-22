import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import {
  PauseIcon as Pause,
  PlayIcon as Play,
  SpeakerHighIcon as Volume2,
  SpeakerSlashIcon as VolumeX,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

function time(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`
}

export function AudioPlayer(props: { src: string; label: string; startAt?: number }) {
  return <AudioPlayerContent key={props.src} {...props} />
}

function AudioPlayerContent({
  src,
  label,
  startAt = 0,
}: {
  src: string
  label: string
  startAt?: number
}) {
  const { t } = useTranslation()

  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const toggle = async () => {
    const player = audio.current
    if (!player) return
    if (!player.paused) {
      player.pause()
      return
    }
    try {
      setError('')
      await player.play()
    } catch {
      setError(t('messages.cannotPlayAudioRightNowPleaseRetry'))
    }
  }
  return (
    <div className="space-y-3 rounded-2xl border p-4" role="group" aria-label={label}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          const player = event.currentTarget
          if (!Number.isFinite(player.duration)) return
          setDuration(player.duration)
          player.currentTime = Math.max(0, Math.min(startAt, player.duration - 1))
          setPosition(player.currentTime)
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false)
          setError(t('messages.failedToLoadAudioCheckYourConnectionAndRetry'))
        }}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={playing ? t('messages.pauseAudio') : t('messages.playAudio')}
          onClick={() => void toggle()}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1 space-y-2">
          <Slider
            aria-label={t('messages.playbackProgress', { label: label })}
            value={[position]}
            min={0}
            max={duration || 1}
            step={0.1}
            disabled={!duration}
            onValueChange={(value) => {
              const next = typeof value === 'number' ? value : value[0]
              if (audio.current) audio.current.currentTime = next
              setPosition(next)
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{time(position)}</span>
            <span>{time(duration)}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={muted ? t('messages.unmute') : t('messages.mute')}
          onClick={() => {
            if (audio.current) audio.current.muted = !muted
            setMuted(!muted)
          }}
        >
          {muted || !volume ? <VolumeX /> : <Volume2 />}
        </Button>
        <Slider
          className="hidden w-20! sm:block"
          aria-label={t('messages.volume')}
          value={[muted ? 0 : volume]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={(value) => {
            const next = typeof value === 'number' ? value : value[0]
            if (audio.current) {
              audio.current.volume = next
              audio.current.muted = false
            }
            setVolume(next)
            setMuted(false)
          }}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
