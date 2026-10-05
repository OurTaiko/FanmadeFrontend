import { describe, expect, it } from 'vitest'
import { hasBranchInCourse, isPlayerMessage, playerLoad } from './embedded-player-protocol'
describe('embedded player boundary', () => {
  const frame = {} as Window
  const origin = 'https://player.example.com'
  const event = (
    source: Window,
    messageOrigin = origin,
    data: unknown = { channel: 'ourtaiko-view', version: 1, type: 'ready' },
  ) => ({ source, origin: messageOrigin, data }) as MessageEvent
  it('accepts messages only from the configured iframe and origin', () => {
    expect(isPlayerMessage(event(frame), frame, origin)).toBe(true)
    expect(isPlayerMessage(event({} as Window), frame, origin)).toBe(false)
    expect(isPlayerMessage(event(frame, 'https://other.example.com'), frame, origin)).toBe(false)
    expect(isPlayerMessage(event(frame), null, origin)).toBe(false)
    expect(
      isPlayerMessage(
        event(frame, origin, { channel: 'ourtaiko-view', version: 2, type: 'ready' }),
        frame,
        origin,
      ),
    ).toBe(false)
  })
  it('keeps practice controls in both modes and reserves replay as disabled', () => {
    const practice = playerLoad(
      'a',
      'TITLE:测试',
      'https://example.com/audio.ogg',
      'Oni',
      'practice',
    )
    const auto = playerLoad('b', 'TITLE:测试', 'https://example.com/audio.ogg', 'Edit', 'auto')
    expect(practice.payload).toMatchObject({
      practice: true,
      autoPlay: false,
      replay: false,
      course: 'Oni',
    })
    expect(auto.payload).toMatchObject({
      practice: true,
      autoPlay: true,
      replay: false,
      course: 'Edit',
    })
    expect(auto.requestId).toBe('b')
  })
})

describe('branch controls', () => {
  const chart = `COURSE:3
#START
1000,
#END
COURSE:4
#START
#BRANCHSTART s,100,200
#N
1000,
#E
1100,
#M
1111,
#BRANCHEND
#END`
  it('shows branches only for the selected course, including numeric COURSE headers', () => {
    expect(hasBranchInCourse(chart, 'Oni')).toBe(false)
    expect(hasBranchInCourse(chart, 'Edit')).toBe(true)
    expect(hasBranchInCourse(chart.replace('#BRANCHSTART', '// #BRANCHSTART'), 'Edit')).toBe(false)
    expect(
      hasBranchInCourse(chart.replace('COURSE:4\n#START', 'COURSE:4\n#START P1'), 'Edit_1p'),
    ).toBe(true)
  })
  it('sends the chosen route independently of practice and automatic modes', () => {
    expect(
      playerLoad('a', chart, 'https://example.com/audio', 'Edit', 'practice', 'wav', 'master')
        .payload,
    ).toMatchObject({ branch: 'master', autoPlay: false, audioType: 'wav' })
    expect(playerLoad('b', chart, 'https://example.com/audio', 'Edit', 'auto').payload.branch).toBe(
      'normal',
    )
  })
})
