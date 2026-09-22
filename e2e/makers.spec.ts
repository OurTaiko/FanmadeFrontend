import { selectValue } from './ui-helpers'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Chart } from '../src/api/types'

const source =
  'TITLE:Maker test\nSUBTITLE:Subtitle\nMAKER:A\nBPM:120\nWAVE:cbr.mp3\n' +
  ['Hard', 'Oni', 'Edit']
    .map((course) => `COURSE:${course}\nLEVEL:5\n#START\n1000,\n#END\n`)
    .join('')
const audio = readFileSync('../backend/internal/audio/testdata/cbr.mp3')
const chart: Chart = {
  id: 'a'.repeat(32),
  versionId: 'b'.repeat(32),
  ownerId: 'owner',
  uploader: 'tester',
  title: 'Maker test',
  subtitle: 'Subtitle',
  maker: 'A | B',
  bpm: 120,
  offset: 0,
  demoStart: 0,
  wave: 'cbr.mp3',
  description: '',
  duration: 1,
  encoding: 'utf-8',
  tjaName: 'chart.tja',
  audioName: 'cbr.mp3',
  tjaHash: 'c'.repeat(64),
  audioHash: 'd'.repeat(64),
  audioSize: audio.length,
  createdAt: '2026-09-15T00:00:00Z',
  categoryIds: ['variety'],
  titleTranslations: {},
  subtitleTranslations: {},
  difficulties: ['Hard', 'Oni', 'Edit'].map((course, blockIndex) => ({
    course,
    blockIndex,
    level: 5,
    player: '',
    style: 'Single',
    cloudScoreEligible: true,
    maker: blockIndex === 1 ? 'B' : 'A',
  })),
}

test('upload maker defaults, individual edits, submitted mapping and per-difficulty credits', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
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
  await page.route(`**/api/v1/charts/${chart.id}`, (route) => route.fulfill({ json: chart }))
  await page.route('**/versions/*/tja', (route) => route.fulfill({ body: source }))
  await page.route('**/versions/*/audio', (route) =>
    route.fulfill({ body: audio, contentType: 'audio/mpeg' }),
  )
  let submitted: unknown
  await page.route('**/api/v1/charts', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const form = await new Response(route.request().postDataBuffer()!, {
      headers: { 'Content-Type': route.request().headers()['content-type'] },
    }).formData()
    submitted = JSON.parse(String(form.get('difficultyMakers')))
    await route.fulfill({ status: 201, json: chart })
  })
  await page.goto('/upload')
  await page
    .getByLabel('选择 TJA 谱面')
    .setInputFiles({ name: 'chart.tja', mimeType: 'text/plain', buffer: Buffer.from(source) })
  await page
    .getByLabel('选择 OGG 或 MP3 音频')
    .setInputFiles({ name: 'cbr.mp3', mimeType: 'audio/mpeg', buffer: audio })
  await expect(page.getByRole('dialog', { name: '本地校验通过' })).toBeVisible()
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('table')).toHaveCount(1)
  for (const [i, course] of ['Hard', 'Oni', 'Edit'].entries())
    await expect(page.getByLabel(`${course} 制作者 #${i + 1}`)).toHaveValue('A')
  await page.getByLabel('Oni 制作者 #2').fill('B')
  await expect(page.locator('[data-testid="preview-panel"] dd').first()).toHaveText('A | B')
  await page.screenshot({ path: 'test-results/makers-upload-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.screenshot({ path: 'test-results/makers-upload-mobile.png', fullPage: true })
  await page.getByRole('button', { name: '发布谱面', exact: true }).click()
  await expect(page).toHaveURL(`/charts/${chart.id}`)
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  expect(submitted).toEqual([
    { blockIndex: 0, maker: 'A' },
    { blockIndex: 1, maker: 'B' },
    { blockIndex: 2, maker: 'A' },
  ])
  await expect(page.locator('[data-testid="detail-facts"]')).toContainText('A | B')
  await expect(page.locator('[data-testid="difficulty-makers"]')).toHaveText('魔王 谱师B')
  for (const course of ['Hard', 'Edit']) {
    await selectValue(page, '选择难度', course)
    await expect(page.locator('[data-testid="difficulty-makers"] dd')).toHaveText('A')
  }
  await page.screenshot({ path: 'test-results/makers-detail-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})
