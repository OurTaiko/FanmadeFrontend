import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Chart } from '../src/api/types'

// Deterministic chart with real OGG and WAV decoding: no production score writes.
const source = `TITLE:Embedded player test
BPM:120
WAVE:test.ogg
OFFSET:-1
COURSE:Oni
LEVEL:1
#START
1111,
2222,
#END
COURSE:4
LEVEL:2
#START
#BRANCHSTART s,100,200
#N
1000,
#E
1100,
#M
1111,
#BRANCHEND
#BRANCHSTART s,2147483646,2147483647
#N
1000,
#BRANCHEND
#END`
const chart: Chart = {
  id: 'view-test',
  ownerId: 'fixture',
  uploader: 'tester',
  title: 'Embedded player test',
  subtitle: '',
  maker: 'tester',
  bpm: 120,
  offset: -1,
  demoStart: 0,
  wave: 'test.ogg',
  description: '',
  createdAt: '2026-10-05T00:00:00Z',
  duration: 6,
  encoding: 'utf-8',
  tjaName: 'test.tja',
  audioName: 'test.ogg',
  tjaHash: 'a'.repeat(64),
  audioHash: 'b'.repeat(64),
  audioSize: 100,
  titleTranslations: {},
  subtitleTranslations: {},
  isSingle: true,
  categoryIds: [],
  difficulties: [
    { course: 'Oni', level: 1, maker: '' },
    { course: 'Edit', level: 2, maker: '' },
  ],
}
function wav() {
  const rate = 22050,
    samples = rate * 6,
    data = Buffer.alloc(44 + samples * 2)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + samples * 2, 4)
  data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(rate, 24)
  data.writeUInt32LE(rate * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++)
    data.writeInt16LE(Math.round(Math.sin((i / rate) * 440 * Math.PI * 2) * 1200), 44 + i * 2)
  return data
}
test('real Unity player: auto, finish reset, practice, course change and unload', async ({
  page,
}) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(15000)
  const errors: string[] = []
  const writes: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('browser:', message.text())
  })
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/')) writes.push(r.url())
  })
  await page.addInitScript(() => {
    const state = window as unknown as { playerEvents: Array<Record<string, unknown>> }
    state.playerEvents = []
    window.addEventListener('message', (event) => {
      if (event.data?.channel === 'ourtaiko-view') state.playerEvents.push(event.data)
    })
  })
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/me') return route.fulfill({ json: { user: null, csrfToken: '' } })
    if (path === '/api/v1/categories') return route.fulfill({ json: { items: [] } })
    if (path.endsWith('/tja')) return route.fulfill({ body: source })
    if (path.endsWith('/audio'))
      return route.fulfill({
        body: readFileSync(new URL('./fixtures/embedded-tone.ogg', import.meta.url)),
        contentType: 'audio/ogg',
      })
    if (path === '/api/v1/charts/view-test') return route.fulfill({ json: chart })
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } })
  })
  await page.route('**/fixture-audio.wav', (route) =>
    route.fulfill({ body: wav(), contentType: 'audio/wav' }),
  )
  await page.goto('/charts/view-test')
  await expect(page.getByRole('tab', { name: '谱面图片', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: '谱面预览', exact: true }).click()
  await page.getByRole('button', { name: '观看谱面', exact: true }).click()
  const frame = page.frameLocator('iframe')
  const loadedCount = () =>
    page.evaluate(
      () =>
        (window as unknown as { playerEvents: Array<{ type: string }> }).playerEvents.filter(
          (e) => e.type === 'loaded',
        ).length,
    )
  const changeAndLoad = async (action: () => Promise<unknown>) => {
    const previous = await loadedCount()
    await action()
    await expect.poll(loadedCount, { timeout: 30000 }).toBe(previous + 1)
    await expect(frame.locator('#start')).toBeVisible()
  }

  await expect
    .poll(async () => frame.locator('#message').innerText(), { timeout: 150000 })
    .not.toContain('Loading player')
  await expect(frame.locator('#start')).toBeVisible({ timeout: 45000 })
  await frame.locator('#start').click()
  await expect(page.getByText('播放结束，已回到第一小节并暂停。')).toBeVisible({ timeout: 30000 })
  const finished = await page.evaluate(() =>
    (
      window as unknown as {
        playerEvents: Array<{
          type: string
          payload: { Good: number; Bad: number; AutoPlay: boolean }
        }>
      }
    ).playerEvents.find((e) => e.type === 'finished'),
  )
  expect(finished?.payload.AutoPlay).toBe(true)
  expect(finished?.payload.Good).toBe(8)
  expect(finished?.payload.Bad).toBe(0)
  const state = async () => {
    return page.evaluate(async () => {
      const frame = document.querySelector('iframe')!
      const requestId = crypto.randomUUID()
      return await new Promise<Record<string, number | boolean | string>>((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', receive)
          reject(new Error('state timeout'))
        }, 5000)
        function receive(event: MessageEvent) {
          if (
            event.source === frame.contentWindow &&
            event.data?.type === 'state' &&
            event.data.requestId === requestId
          ) {
            clearTimeout(timeout)
            window.removeEventListener('message', receive)
            resolve(event.data.payload)
          }
        }
        window.addEventListener('message', receive)
        frame.contentWindow!.postMessage(
          { channel: 'ourtaiko-view', version: 1, type: 'getState', requestId },
          location.origin,
        )
      })
    })
  }
  const ended = await state()
  expect(ended.paused).toBe(true)
  expect(ended.position).toBe(ended.first)
  expect(ended.good).toBe(0)
  await page.screenshot({ path: 'test-results/embedded-auto-finished.png' })
  await changeAndLoad(() => page.getByRole('button', { name: '练习', exact: true }).click())
  await expect(frame.locator('#start')).toBeVisible({ timeout: 30000 })
  await frame.locator('#start').click()
  const preparing = await state()
  expect(Number(preparing.time)).toBeLessThan(Number(preparing.first) - 1.7)
  expect(preparing.bad).toBe(0)
  await page.waitForTimeout(1800)
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press('f')
    await page.waitForTimeout(40)
  }
  expect((await state()).autoPlay).toBe(false)
  expect(Number((await state()).score)).toBeGreaterThan(0)
  await page.keyboard.press('Space')
  await expect.poll(async () => (await state()).paused).toBe(true)
  await page.screenshot({ path: 'test-results/embedded-practice.png' })
  await page.evaluate(() => {
    const target = document.querySelector('iframe')!.contentWindow!
    for (const type of ['restart', 'start'])
      target.postMessage({ channel: 'ourtaiko-view', version: 1, type }, location.origin)
  })
  await page.waitForTimeout(1800)
  const canvas = frame.locator('canvas')
  const size = await canvas.boundingBox()
  expect(size).not.toBeNull()
  for (let i = 0; i < 12; i++) {
    await canvas.click({ position: { x: size!.width * 0.45, y: size!.height * 0.9 } })
    await page.waitForTimeout(40)
  }
  expect(Number((await state()).score)).toBeGreaterThan(0)

  console.log('manual input verified; changing course')
  await changeAndLoad(() => page.getByRole('tab', { name: /里谱/ }).click())
  await expect(frame.locator('#start')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('combobox', { name: '选择分支' })).toBeVisible()
  await changeAndLoad(() => page.getByRole('button', { name: '观看谱面', exact: true }).click())
  await expect(frame.locator('#start')).toBeVisible({ timeout: 30000 })
  for (const [label, route, notes] of [
    ['普通分支', 'Normal', 2],
    ['玄人分支', 'Expert', 3],
    ['达人分支', 'Master', 5],
  ] as const) {
    console.log('checking route', route)
    if (route !== 'Normal') {
      await page.getByRole('combobox', { name: '选择分支' }).click()
      await changeAndLoad(() => page.getByRole('option', { name: label, exact: true }).click())
      await expect(frame.locator('#start')).toBeVisible({ timeout: 30000 })
      expect((await state()).forcedBranch).toBe(route)
    }
    await expect(frame.locator('#start')).toBeVisible({ timeout: 30000 })
    expect((await state()).paused).toBe(true)
    await frame.locator('#start').click()
    await expect(page.getByText('播放结束，已回到第一小节并暂停。')).toBeVisible({ timeout: 30000 })
    const result = await page.evaluate(() => {
      const events = (
        window as unknown as { playerEvents: Array<{ type: string; payload: { Good: number } }> }
      ).playerEvents
      return events.filter((e) => e.type === 'finished').at(-1)?.payload
    })
    expect(result?.Good).toBe(notes)
  }
  await page.screenshot({ path: 'test-results/embedded-branches.png' })
  // Also exercise WAV through the same browser PCM decoder without reloading WASM.
  await page.evaluate((chartText) => {
    document.querySelector('iframe')!.contentWindow!.postMessage(
      {
        channel: 'ourtaiko-view',
        version: 1,
        type: 'load',
        requestId: 'wav-check',
        payload: {
          chartText,
          audioUrl: new URL('/fixture-audio.wav', location.href).href,
          audioType: 'wav',
          course: 'Oni',
          practice: true,
          autoPlay: false,
          replay: false,
        },
      },
      location.origin,
    )
  }, source)
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (
            window as unknown as { playerEvents: Array<{ type: string; requestId: string }> }
          ).playerEvents.some((e) => e.type === 'loaded' && e.requestId === 'wav-check'),
        ),
      { timeout: 30000 },
    )
    .toBe(true)
  expect((await state()).paused).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.getByRole('tab', { name: '谱面图片', exact: true }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})
