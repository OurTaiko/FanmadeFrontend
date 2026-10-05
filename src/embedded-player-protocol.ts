import { parseTjaCourse } from './courses'
export const playerChannel = 'ourtaiko-view'
export type PlayerMode = 'practice' | 'auto'
export function playerLoad(
  requestId: string,
  chartText: string,
  audioUrl: string,
  course: string,
  mode: PlayerMode,
  audioType = 'ogg',
  branch: 'normal' | 'expert' | 'master' = 'normal',
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
      branch,
      course,
      practice: true,
      autoPlay: mode === 'auto',
      replay: false,
    },
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

export function hasBranchInCourse(source: string, requested: string): boolean {
  let course = 'Oni',
    active = false
  for (const raw of source.replace(/\r/g, '').split('\n')) {
    const line = raw.split('//')[0].trim()
    const header = /^COURSE:(.*)$/i.exec(line)
    if (header) {
      const value = header[1].trim()
      course = value.includes('_') ? value : parseTjaCourse(value) || value
    }
    if (/^#START(?:\s|$)/i.test(line)) {
      const part = /\s+P([12])$/i.exec(line)
      active = (part ? `${course}_${part[1]}p` : course).toLowerCase() === requested.toLowerCase()
    }
    if (/^#END$/i.test(line)) active = false
    if (active && /^#BRANCHSTART(?:\s|$)/i.test(line)) return true
  }
  return false
}
