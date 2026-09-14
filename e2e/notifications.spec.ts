import { test, expect } from '@playwright/test'

// Isolated responses: no accounts, email delivery or production mutations.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/me', (route) =>
    route.fulfill({ json: { user: null, csrfToken: '' } }),
  )
})

test('errors are modal, dismissible and repeat on another failed attempt', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({ status: 401, json: { message: '用户名或密码不正确' } }),
  )
  await page.goto('/login')
  await page.getByLabel('用户名', { exact: true }).fill('tester')
  await page.getByLabel('密码', { exact: true }).fill('wrong-password')
  const login = page.getByRole('button', { name: '登录', exact: true })
  for (const close of ['escape', 'button']) {
    await login.click()
    const popup = page.getByRole('alertdialog', { name: '操作未完成' })
    await expect(popup).toContainText('用户名或密码不正确')
    await expect(page.locator('main .notice, main [role="alert"]')).toHaveCount(0)
    if (close === 'escape') await page.keyboard.press('Escape')
    else await popup.getByRole('button', { name: '知道了' }).click()
    await expect(popup).toHaveCount(0)
    await expect(page.getByText('用户名或密码不正确')).toHaveCount(0)
    await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('tester')
  }
})

test('email success disappears after dismissal and does not reopen on input changes', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/email-code', (route) =>
    route.fulfill({ json: { verificationId: 'fixture', retryAfter: 60 } }),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel('邮箱', { exact: true }).fill('fixture@example.test')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  const popup = page.getByRole('dialog', { name: '操作成功' })
  await expect(popup).toContainText('验证码已发送')
  const rect = await popup.boundingBox()
  expect(rect!.x).toBeGreaterThanOrEqual(0)
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(390)
  await popup.getByRole('button', { name: '知道了' }).click()
  await page.getByLabel('邮箱验证码', { exact: true }).fill('123456')
  await expect(popup).toHaveCount(0)
  await expect(page.locator('main .email-code-hint')).toHaveCount(0)
})
