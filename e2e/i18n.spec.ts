import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { Chart, User } from '../src/api/types'

const chart: Chart = {
  id: 'language-chart',
  title: 'Original title',
  subtitle: '--Original subtitle',
  titleTranslations: { zh: '中文曲名', ja: '日本語の曲名', ko: '한국어 곡명' },
  subtitleTranslations: { zh: '中文副标题', ja: '--日本語の副題', ko: '한국어 부제' },
  ownerId: 'language-user',
  uploader: 'Test creator',
  versionId: 'version1',
  categoryIds: [],
  description: '',
  createdAt: '2026-09-22T00:00:00Z',
  duration: 60,
  encoding: 'utf-8',
  tjaName: 'test.tja',
  audioName: 'test.ogg',
  tjaHash: 'test',
  audioHash: 'test',
  audioSize: 100,
  maker: 'Maker',
  bpm: 120,
  offset: 0,
  demoStart: 0,
  wave: 'test.ogg',
  difficulties: [
    {
      course: 'Oni',
      level: 5,
      blockIndex: 0,
      player: '',
      maker: 'Maker',
      style: 'Single',
      cloudScoreEligible: true,
    },
  ],
}
async function fixture(page: Page, language?: string, loggedIn = true) {
  let user: User | null = loggedIn
    ? {
        id: 'language-user',
        username: 'Tester',
        nickname: 'Tester',
        emailVerified: true,
        isAdmin: false,
        preferredLanguage: language,
      }
    : null
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/me') return route.fulfill({ json: { user, csrfToken: 'test' } })
    if (path.endsWith('/logout')) {
      user = null
      return route.fulfill({ json: {} })
    }
    if (path.endsWith('/categories')) return route.fulfill({ json: { items: [] } })
    if (path.endsWith('/tja'))
      return route.fulfill({
        body: 'TITLE:Original title\nBPM:120\nCOURSE:Oni\nLEVEL:5\n#START\n1000,\n#END\n',
      })
    if (path.endsWith('/leaderboard'))
      return route.fulfill({
        json: { items: [], total: 0, page: 1, pageSize: 20, supported: true },
      })
    if (path === '/api/v1/charts/language-chart') return route.fulfill({ json: chart })
    return route.fulfill({ json: { items: [chart], total: 1, page: 1, pageSize: 20 } })
  })
  return {
    setLanguage(value: string) {
      if (user) user = { ...user, preferredLanguage: value }
    },
  }
}

for (const [language, htmlLanguage, heading, title, subtitle] of [
  ['zh-hans', 'zh-CN', '发现好谱。', '中文曲名', '中文副标题'],
  ['en', 'en', 'Discover great charts.', 'Original title', 'Original subtitle'],
  ['ja', 'ja', 'お気に入りの譜面を見つけよう。', '日本語の曲名', '日本語の副題'],
  ['ko', 'ko', '멋진 채보를 발견하세요.', '한국어 곡명', '한국어 부제'],
]) {
  test(`SSO ${language} renders library, details and mobile layout`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await fixture(page, language)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguage)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    const card = page.getByTestId('chart-card')
    await expect(card).toContainText(title)
    await expect(card).toContainText(subtitle)
    await card.click()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await page.screenshot({ path: `test-results/i18n-${language}-mobile.png`, fullPage: true })
    await expect(page.locator('body')).not.toContainText(/\{\{\w+\}\}/)
    expect(errors).toEqual([])
  })
}

test('refreshes account language on focus, keeps edit draft and resets after logout', async ({
  page,
}) => {
  const account = await fixture(page, 'en')
  await page.goto('/charts/language-chart')
  await page.getByRole('button', { name: 'Edit information', exact: true }).click()
  await page.locator('#edit-ja-title').fill('Unsaved draft')
  account.setLanguage('ja')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page.getByRole('dialog')).toContainText('譜面情報を編集')
  await expect(page.locator('#edit-ja-title')).toHaveValue('Unsaved draft')
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click()
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByRole('heading', { name: '中文曲名', exact: true })).toBeVisible()
})

for (const language of [undefined, 'invalid-language']) {
  test(`missing or unsupported preference falls back to Chinese: ${language}`, async ({ page }) => {
    await fixture(page, language)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '发现好谱。' })).toBeVisible()
    await expect(page.getByTestId('chart-card')).toContainText('中文曲名')
  })
}

test('anonymous visitors use Chinese even with an English browser preference', async ({ page }) => {
  await fixture(page, undefined, false)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByTestId('chart-card')).toContainText('中文曲名')
})
