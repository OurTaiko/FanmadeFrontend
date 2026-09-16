import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { mailboxCode } from './registration-helpers'

test.skip(!process.env.FANMADE_TEST_MAILBOX, 'Requires isolated backend mail fixture')

test('empty code disables verification; wrong code reports backend error; correct code creates verified account', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/register')
  const verify = page.getByRole('button', { name: '验证并创建账号', exact: true })
  const send = page.getByRole('button', { name: '获取验证码', exact: true })
  await expect(verify).toBeDisabled()
  await expect(send).toBeDisabled()
  await page.getByLabel('用户名', { exact: true }).fill('invalid_name')
  expect(
    await page
      .getByLabel('用户名', { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.patternMismatch),
  ).toBe(true)
  await page.getByLabel('用户名', { exact: true }).fill('verifiedBrowser')
  await page.getByLabel('密码', { exact: true }).fill('browser-password-123')
  await page.getByLabel('邮箱', { exact: true }).fill('Browser@Example.test')
  await send.click()
  await expect(page.getByRole('dialog', { name: '操作成功' })).toContainText('验证码已发送')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('button', { name: /秒后重发/ })).toBeDisabled()
  await expect(verify).toBeDisabled()
  const code = mailboxCode('browser@example.test')
  const input = page.getByLabel('邮箱验证码', { exact: true })
  await input.fill('123')
  await expect(verify).toBeDisabled()
  await input.fill(code === '000000' ? '111111' : '000000')
  await verify.click()
  await expect(page.getByRole('alertdialog')).toContainText('验证码不正确，请检查邮件后重试')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  expect((await (await page.request.get('/api/v1/me')).json()).user).toBeNull()
  await input.fill(code)
  await verify.click()
  await expect(page).toHaveURL(/\/upload$/)
  const me = await (await page.request.get('/api/v1/me')).json()
  expect(me.user.username).toBe('verifiedBrowser')
  expect(me.user.emailVerified).toBe(true)
  expect(me.user.nickname).toBe('verifiedBrowser')
  const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
  const uploaded = await page.request.post('/api/v1/charts', {
    headers: { Origin: origin, 'X-CSRF-Token': me.csrfToken, 'Idempotency-Key': randomUUID() },
    multipart: {
      tja: {
        name: 'nickname.tja',
        mimeType: 'text/plain',
        buffer: Buffer.from(
          'TITLE:Nickname test\nBPM:120\nWAVE:cbr.mp3\nCOURSE:Oni\nLEVEL:5\n#START\n1000,\n#END\n',
        ),
      },
      audio: {
        name: 'cbr.mp3',
        mimeType: 'audio/mpeg',
        buffer: readFileSync('../backend/internal/audio/testdata/cbr.mp3'),
      },
    },
  })
  expect(uploaded.status()).toBe(201)
  const chart = await uploaded.json()
  const score = await page.request.post('/api/v1/scores', {
    headers: { Origin: origin, 'X-CSRF-Token': me.csrfToken },
    data: {
      songId: chart.id,
      versionId: chart.versionId,
      difficulty: 'Oni',
      good: 1,
      ok: 0,
      bad: 0,
      score: 100,
      drumroll: 0,
      max_combo: 1,
    },
  })
  expect(score.status()).toBe(201)
  await page.getByRole('link', { name: '个人资料', exact: true }).click()
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('verifiedBrowser')
  await expect(page.getByLabel('用户名', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByLabel('昵称', { exact: true }).fill('节奏创作者 🎵')
  await page.getByRole('button', { name: '保存昵称', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('昵称已保存。')
  await expect(page.locator('.account-nickname')).toHaveText('节奏创作者 🎵')
  const saved = await (await page.request.get('/api/v1/me')).json()
  expect(saved.user.username).toBe('verifiedBrowser')
  expect(saved.user.nickname).toBe('节奏创作者 🎵')
  await page.reload()
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('节奏创作者 🎵')
  await page.goto(`/charts/${chart.id}`)
  await expect(page.locator('.detail-facts')).toContainText('节奏创作者 🎵')
  await expect(page.locator('.metadata dd')).toContainText(['节奏创作者 🎵'])
  await page.getByRole('tab', { name: '排行榜', exact: true }).click()
  await expect(page.getByRole('rowheader', { name: '节奏创作者 🎵你' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('verifiedBrowser')
  const board = await (
    await page.request.get(`/api/v1/charts/${chart.id}/leaderboard?difficulty=Oni`)
  ).json()
  expect(board.items[0].nickname).toBe('节奏创作者 🎵')
  expect(board.items[0]).not.toHaveProperty('username')
  const hiddenSearch = await (await page.request.get('/api/v1/charts?q=verifiedBrowser')).json()
  expect(hiddenSearch.total).toBe(0)

  expect(errors).toEqual([])
})

test('changing email clears its code and validation; mobile registration fits viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel('邮箱', { exact: true }).fill('change@example.test')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '操作成功' })).toContainText('验证码已发送')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await page.getByLabel('邮箱验证码', { exact: true }).fill(mailboxCode('change@example.test'))
  await page.getByLabel('邮箱', { exact: true }).fill('other@example.test')
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: '验证并创建账号' })).toBeDisabled()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/register-mobile.png', fullPage: true })
})

test('delivery failure and server throttling display readable errors', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('邮箱', { exact: true }).fill('delivery@example.test')
  await page.route('**/api/v1/auth/email-code', (route) =>
    route.fulfill({ status: 503, json: { message: '验证码邮件发送失败，请稍后重试' } }),
  )
  await page.getByRole('button', { name: '获取验证码' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('验证码邮件发送失败，请稍后重试')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('button', { name: '验证并创建账号' })).toBeDisabled()
  await page.unroute('**/api/v1/auth/email-code')
  await page.route('**/api/v1/auth/email-code', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'Retry-After': '30' },
      json: { message: '验证码已发送，请稍后再获取' },
    }),
  )
  await page.getByRole('button', { name: '获取验证码' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('验证码已发送，请稍后再获取')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('button', { name: /秒后重发/ })).toBeDisabled()
})

test('login does not require a registration code', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled()
})
