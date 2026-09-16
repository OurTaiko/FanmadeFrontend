import { expect, test } from '@playwright/test'

const base = {
  user: {
    id: 'owner',
    username: 'PrivateLogin123',
    nickname: '公开昵称',
    emailVerified: true,
    isAdmin: false,
  },
  csrfToken: 'csrf',
}

test('profile displays own login name, validates nickname, keeps draft on failure and updates all navigation', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  let current = structuredClone(base)
  let requests = 0
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: current })
    expect(route.request().method()).toBe('PATCH')
    expect(route.request().headers()['x-csrf-token']).toBe('csrf')
    expect(route.request().postDataJSON()).toEqual({ nickname: '新的昵称 🎵' })
    requests++
    if (requests === 1) return route.fulfill({ status: 503, json: { message: '保存失败，请重试' } })
    current = { ...base, user: { ...base.user, nickname: '新的昵称 🎵' } }
    await route.fulfill({ json: current })
  })
  await page.goto('/me/profile')
  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('PrivateLogin123')
  await expect(page.getByLabel('用户名', { exact: true })).toHaveAttribute('readonly', '')
  await expect(page.locator('.account-nickname')).toHaveText('公开昵称')
  await expect(page.locator('body')).not.toContainText('PrivateLogin123')
  const save = page.getByRole('button', { name: '保存昵称', exact: true })
  const input = page.getByLabel('昵称', { exact: true })
  await expect(save).toBeDisabled()
  await input.fill('   ')
  await expect(save).toBeDisabled()
  await input.fill('中'.repeat(41))
  await expect(save).toBeDisabled()
  await input.fill('🎵'.repeat(40))
  await expect(save).toBeEnabled()
  await expect(page.locator('#nickname-count')).toHaveText('40 / 40')
  await input.fill('  新的昵称 🎵  ')
  await save.click()
  await expect(page.getByRole('alertdialog')).toContainText('保存失败，请重试')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(input).toHaveValue('  新的昵称 🎵  ')
  await expect(page.locator('.account-nickname')).toHaveText('公开昵称')
  await save.click()
  await expect(page.getByRole('status')).toHaveText('昵称已保存。')
  await expect(input).toHaveValue('新的昵称 🎵')
  await expect(page.locator('.account-nickname')).toHaveText('新的昵称 🎵')
  await expect(save).toBeDisabled()
  await page.screenshot({ path: 'test-results/profile-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.screenshot({ path: 'test-results/profile-mobile.png', fullPage: true })
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /发布谱面/ })
    .click()
  await expect(page.locator('body')).not.toContainText('PrivateLogin123')
  await expect(page.locator('.account-nickname')).toHaveText('新的昵称 🎵')
  await page.getByRole('link', { name: '打开个人资料' }).click()
  await expect(input).toHaveValue('新的昵称 🎵')
  await page.reload()
  await expect(input).toHaveValue('新的昵称 🎵')
  expect(requests).toBe(2)
  expect(errors).toEqual([])
})

test('anonymous profile requires login; legacy username login remains possible', async ({
  page,
}) => {
  await page.route('**/api/v1/me', (route) =>
    route.fulfill({ json: { user: null, csrfToken: '' } }),
  )
  await page.goto('/me/profile')
  await expect(page.getByRole('heading', { name: '登录后查看个人资料' })).toBeVisible()
  await expect(page.getByLabel('昵称', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: '前往登录' }).click()
  const username = page.getByLabel('用户名', { exact: true })
  await username.fill('legacy_user')
  expect(await username.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true)
  await page.getByRole('link', { name: '创建账号', exact: true }).click()
  await expect(page.getByRole('heading', { name: '加入这段节奏。' })).toBeVisible()
  await expect(username).toHaveAttribute('pattern', '[A-Za-z0-9]{3,24}')
  await username.fill('legacy_user')
  expect(await username.evaluate((input: HTMLInputElement) => input.validity.patternMismatch)).toBe(
    true,
  )
  await username.fill('Valid123')
  expect(await username.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true)
})

test('saving a nickname leaves the mobile page scrollable without dismissing a prompt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 })
  let current = structuredClone(base)
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      current = { ...base, user: { ...base.user, nickname: '新的昵称 🎵' } }
    }
    await route.fulfill({ json: current })
  })
  await page.goto('/me/profile')
  await page.getByLabel('昵称', { exact: true }).fill('新的昵称 🎵')
  await page.getByRole('button', { name: '保存昵称', exact: true }).click()
  await expect(page.locator('.account-nickname')).toHaveText('新的昵称 🎵')
  const savedScrollY = await page.evaluate(() => scrollY)
  expect(savedScrollY).toBeGreaterThan(0)
  await page.mouse.move(10, 320)
  await page.mouse.wheel(0, -600)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(savedScrollY)
  await expect(page.getByRole('status')).toHaveText('昵称已保存。')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await page.getByRole('status').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/profile-mobile-saved.png', fullPage: true })
  await page.getByLabel('昵称', { exact: true }).fill('继续修改')
  await expect(page.getByRole('status')).toBeEmpty()
})
