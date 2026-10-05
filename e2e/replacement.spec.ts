import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Chart } from '../src/api/types'

const audio = readFileSync('../backend/internal/audio/testdata/cbr.mp3')
const source =
  'TITLE:Replacement preview\nSUBTITLE:New subtitle\nMAKER:A\nBPM:120\nWAVE:cbr.mp3\n' +
  ['Hard', 'Oni'].map((course) => `COURSE:${course}\nLEVEL:5\n#START\n1000,\n#END\n`).join('')
const original: Chart = {
  id: 'a'.repeat(32),
  ownerId: 'owner',
  uploader: 'tester',
  title: 'Original song',
  subtitle: '',
  maker: 'A',
  bpm: 120,
  offset: 0,
  demoStart: 0,
  wave: 'cbr.mp3',
  description: 'Keep description',
  categoryIds: ['variety'],
  duration: 1,
  encoding: 'utf-8',
  tjaName: 'chart.tja',
  audioName: 'cbr.mp3',
  tjaHash: 'c'.repeat(64),
  audioHash: 'd'.repeat(64),
  audioSize: audio.length,
  createdAt: '2026-09-15T00:00:00Z',
  titleTranslations: {},
  subtitleTranslations: {},
  isSingle: true,
  difficulties: [
    {
      course: 'Hard',
      level: 5,
      maker: 'A',
    },
  ],
}

for (const replaceAudio of [false, true]) {
  test(`replace chart ${replaceAudio ? 'and audio' : 'retaining audio'}, confirm destructive update`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    let current = original
    let submitted: FormData | undefined
    let attempts = 0
    let requestKey = ''
    await page.route('**/api/v1/me', (route) =>
      route.fulfill({
        json: {
          user: {
            id: 'owner',
            username: 'tester',
            nickname: '测试昵称',
            isAdmin: false,
            emailVerified: true,
          },
          csrfToken: 'csrf',
        },
      }),
    )
    await page.route('**/api/v1/categories', (route) =>
      route.fulfill({ json: { items: [{ id: 'variety', title: '综艺', genre: 'バラエティ' }] } }),
    )
    await page.route(`**/api/v1/charts/${original.id}`, (route) => route.fulfill({ json: current }))
    await page.route('**/api/v1/charts/*/tja', (route) => route.fulfill({ body: source }))
    await page.route('**/api/v1/charts/*/audio', (route) =>
      route.fulfill({ body: audio, contentType: 'audio/mpeg' }),
    )
    await page.route('**/leaderboard?*', (route) =>
      route.fulfill({
        json: {
          songId: current.id,
          difficulty: 'Hard',
          supported: true,
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
        },
      }),
    )
    await page.route(`**/api/v1/charts/${original.id}/files`, async (route) => {
      expect(route.request().method()).toBe('PUT')
      expect(route.request().headers()['x-csrf-token']).toBe('csrf')
      expect(route.request().headers()['idempotency-key']).toMatch(/^[a-f0-9]{32}$/)
      submitted = await new Response(route.request().postDataBuffer()!, {
        headers: { 'Content-Type': route.request().headers()['content-type'] },
      }).formData()
      if (requestKey) expect(route.request().headers()['idempotency-key']).toBe(requestKey)
      requestKey = route.request().headers()['idempotency-key']
      attempts++
      // A recoverable server failure leaves the selected files and maker edits intact.
      if (attempts === 1)
        return route.fulfill({ status: 503, json: { message: '保存失败，旧数据保持不变' } })
      current = {
        ...original,
        tjaHash: 'e'.repeat(64),
        audioHash: replaceAudio ? 'f'.repeat(64) : original.audioHash,
        title: 'Replacement preview',
        maker: 'A | B',
        isSingle: true,
        difficulties: [
          original.difficulties[0],
          { ...original.difficulties[0], course: 'Oni', maker: 'B' },
        ],
      }
      await route.fulfill({ json: current })
    })
    await page.goto(`/charts/${original.id}`)
    await page.getByRole('link', { name: '更新歌曲与谱面' }).click()
    await expect(page.getByRole('heading', { name: '更新歌曲与谱面' })).toBeVisible()
    await expect(page.getByLabel('更新须知')).toContainText('即使某个难度没有变化也不继承成绩')
    await page.getByRole('tab', { name: '谱面介绍', exact: true }).click()
    await expect(page.getByLabel('投稿说明')).toHaveValue('Keep description')
    await page.getByRole('tab', { name: '文件与封面', exact: true }).click()
    await page
      .getByLabel('选择 TJA 谱面')
      .setInputFiles({ name: 'updated.tja', mimeType: 'text/plain', buffer: Buffer.from(source) })
    await expect(page.getByRole('dialog', { name: '本地校验通过' })).toBeVisible()
    await page.getByRole('button', { name: '知道了', exact: true }).click()
    if (replaceAudio) {
      await page
        .getByLabel('选择 OGG 或 MP3 音频')
        .setInputFiles({ name: 'cbr.mp3', mimeType: 'audio/mpeg', buffer: audio })
      await expect(page.getByRole('dialog', { name: '本地校验通过' })).toBeVisible()
      await page.getByRole('button', { name: '知道了', exact: true }).click()
    }
    await page.getByRole('tab', { name: '试听', exact: true }).click()
    await page.getByLabel('试听开始（秒）').fill('0.1')
    await page.getByLabel('试听结束（秒）').fill('0.3')
    await page.getByRole('tab', { name: '谱师名义', exact: true }).click()
    await page.getByLabel('Oni 制作者').fill('B')
    await page.screenshot({
      path: `test-results/replacement-${replaceAudio}-desktop.png`,
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await page.getByRole('button', { name: '更新歌曲与谱面', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toContainText('未改动的难度也会清空成绩')
    await page.screenshot({ path: `test-results/replacement-${replaceAudio}-confirmation.png` })
    await page.getByRole('button', { name: '取消', exact: true }).click()
    expect(attempts).toBe(0)
    await page.getByRole('button', { name: '更新歌曲与谱面', exact: true }).click()
    await page.getByRole('button', { name: '确认替换并清空' }).click()
    await expect(page.getByRole('alertdialog')).toContainText('保存失败，旧数据保持不变')
    await page.getByRole('button', { name: '知道了', exact: true }).click()
    await expect(page.getByLabel('Oni 制作者')).toHaveValue('B')
    await page.getByRole('button', { name: '更新歌曲与谱面', exact: true }).click()
    await page.getByRole('button', { name: '确认替换并清空' }).click()
    await expect(page).toHaveURL(`/charts/${original.id}`)
    expect(attempts).toBe(2)
    expect(submitted?.has('expectedVersionId')).toBe(false)
    expect(submitted?.get('confirmReset')).toBe('true')
    expect(submitted?.has('audio')).toBe(replaceAudio)
    expect(submitted?.get('description')).toBe(original.description)
    expect(JSON.parse(String(submitted?.get('difficultyMakers')))).toEqual([
      { course: 'Hard', maker: 'A' },
      { course: 'Oni', maker: 'B' },
    ])
    await page.getByRole('button', { name: '知道了', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
    await expect(page.locator('[data-testid="detail-facts"]')).toContainText('A | B')
    expect(errors).toEqual([])
  })
}
