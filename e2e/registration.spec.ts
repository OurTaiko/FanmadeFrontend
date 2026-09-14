import { test, expect } from '@playwright/test'
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
  await page.getByLabel('用户名', { exact: true }).fill('verified_browser')
  await page.getByLabel('密码', { exact: true }).fill('browser-password-123')
  await page.getByLabel('邮箱', { exact: true }).fill('Browser@Example.test')
  await send.click()
  await expect(page.getByRole('status')).toContainText('验证码已发送')
  await expect(page.getByRole('button', { name: /秒后重发/ })).toBeDisabled()
  await expect(verify).toBeDisabled()
  const code = mailboxCode('browser@example.test')
  const input = page.getByLabel('邮箱验证码', { exact: true })
  await input.fill('123')
  await expect(verify).toBeDisabled()
  await input.fill(code === '000000' ? '111111' : '000000')
  await verify.click()
  await expect(page.getByRole('alert')).toHaveText('验证码不正确，请检查邮件后重试')
  await expect(page).toHaveURL(/\/register$/)
  expect((await (await page.request.get('/api/v1/me')).json()).user).toBeNull()
  await input.fill(code)
  await verify.click()
  await expect(page).toHaveURL(/\/upload$/)
  const me = await (await page.request.get('/api/v1/me')).json()
  expect(me.user.username).toBe('verified_browser')
  expect(me.user.emailVerified).toBe(true)
  expect(errors).toEqual([])
})

test('changing email clears its code and validation; mobile registration fits viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel('邮箱', { exact: true }).fill('change@example.test')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('验证码已发送')
  await page.getByLabel('邮箱验证码', { exact: true }).fill(mailboxCode('change@example.test'))
  await page.getByLabel('邮箱', { exact: true }).fill('other@example.test')
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: '验证并创建账号' })).toBeDisabled()
  await expect(page.getByRole('status')).toHaveCount(0)
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
  await expect(page.getByRole('alert')).toHaveText('验证码邮件发送失败，请稍后重试')
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
  await expect(page.getByRole('alert')).toHaveText('验证码已发送，请稍后再获取')
  await expect(page.getByRole('button', { name: /秒后重发/ })).toBeDisabled()
})

test('login does not require a registration code', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled()
})
