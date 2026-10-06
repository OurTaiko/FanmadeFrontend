export const playerChannel = 'ourtaiko-view'
export type PlayerMode = 'practice' | 'auto'
export function playerLoad(
  requestId: string,
  chartText: string,
  audioUrl: string,
  course: string,
  mode: PlayerMode,
  audioType = 'ogg',
) {
  return {
    channel: playerChannel,
    version: 1,
    type: 'load',
    requestId,
    payload: {
      chartText,
      audioUrl,
      audioType,
      course,
      practice: true,
      autoPlay: mode === 'auto',
      replay: false,
    },
  }
}
export const defaultDrumVolume = 100
// Hit-sound volume, 0-100; the player rejects anything else.
export function playerDrumVolume(requestId: string, volume: number) {
  const value = Number.isFinite(volume) ? Math.round(Math.min(100, Math.max(0, volume))) : 100
  return {
    channel: playerChannel,
    version: 1,
    type: 'setDrumVolume',
    requestId,
    payload: { volume: value },
  }
}
export function isPlayerMessage(
  event: MessageEvent,
  source: Window | null,
  origin: string,
): boolean {
  return (
    source !== null &&
    event.source === source &&
    event.origin === origin &&
    event.data?.channel === playerChannel &&
    event.data?.version === 1 &&
    typeof event.data?.type === 'string'
  )
}
