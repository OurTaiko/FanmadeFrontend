import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('owner edits preview range while player keeps full audio source', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let chart = {
    id: 'preview-song',
    ownerId: 'owner',
    uploader: 'tester',
    title: 'Preview test',
    subtitle: '',
    titleTranslations: { en: 'Preview test' },
    subtitleTranslations: {},
    maker: 'A',
    bpm: 120,
    offset: 0,
    demoStart: 12,
    demoEnd: 27,
    previewPath: 'fanmade/production/previews/old/preview.ogg',
    wave: 'audio.ogg',
    description: '',
    createdAt: '2026-10-05T00:00:00Z',
    duration: 100,
    encoding: 'utf-8',
    tjaName: 'song.tja',
    audioName: 'audio.ogg',
    tjaHash: 'a'.repeat(64),
    audioHash: 'b'.repeat(64),
    audioSize: 100,
    categoryIds: [],
    isSingle: true,
    difficulties: [{ course: 'Oni', level: 5, maker: 'A' }],
  }
  const patches: unknown[] = []
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/me'))
      return route.fulfill({
        json: {
          user: {
            id: 'owner',
            username: 'tester',
            nickname: 'tester',
            emailVerified: true,
            isAdmin: false,
          },
          csrfToken: 'csrf',
        },
      })
    if (path.endsWith('/categories')) return route.fulfill({ json: { items: [] } })
    if (path.endsWith('/tja'))
      return route.fulfill({
        body: 'TITLE:Preview test\nBPM:120\nCOURSE:Oni\nLEVEL:5\n#START\n1000,\n#END',
      })
    if (path.endsWith('/audio')) {
      return route.fulfill({ status: 204 })
    }
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON()
      patches.push(patch)
      expect(route.request().headers()['x-csrf-token']).toBe('csrf')
      chart = { ...chart, ...patch, previewPath: 'fanmade/production/previews/new/preview.ogg' }
    }
    return route.fulfill({ json: chart })
  })
  await page.goto('/charts/preview-song')
  await page.getByRole('button', { name: '编辑信息', exact: true }).click()
  await page.getByRole('tab', { name: '试听', exact: true }).click()
  await expect(page.getByLabel('试听开始（秒）')).toHaveValue('12')
  await expect(page.getByLabel('试听结束（秒）')).toHaveValue('27')
  await page.getByLabel('试听结束（秒）').fill('10')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('终点须晚于起点')
  expect(patches).toHaveLength(0)
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await page.getByRole('tab', { name: '谱面介绍', exact: true }).click()
  await page.getByRole('textbox', { name: '谱面介绍', exact: true }).fill('新的介绍')
  await page.getByRole('tab', { name: '谱师名义', exact: true }).click()
  await page.getByLabel('Oni ★5', { exact: true }).fill('New maker')
  await page.getByRole('tab', { name: '译名', exact: true }).click()
  await page.getByLabel('英文歌名', { exact: true }).fill('New title')
  await page.getByRole('tab', { name: '试听', exact: true }).click()
  await page.getByLabel('试听开始（秒）').fill('20.5')
  await page.getByLabel('试听结束（秒）').fill('36')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect.poll(() => patches.length).toBe(1)
  expect(patches[0]).toEqual({
    demoStart: 20.5,
    demoEnd: 36,
    description: '新的介绍',
    difficultyMakers: [{ course: 'Oni', maker: 'New maker' }],
    titleTranslations: { en: 'New title' },
  })
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await page.getByRole('button', { name: '试听', exact: true }).click()
  await expect(page.locator('audio')).toHaveAttribute(
    'src',
    /\/api\/v1\/charts\/preview-song\/audio$/,
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '编辑信息', exact: true }).click()
  await page.getByRole('tab', { name: '试听', exact: true }).click()
  await expect(page.getByLabel('试听开始（秒）')).toHaveValue('20.5')
  await expect(page.getByLabel('试听结束（秒）')).toHaveValue('36')
  expect(errors).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('tab', { name: '译名', exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/fanmade-preview-editor.png', animations: 'disabled' })
})
