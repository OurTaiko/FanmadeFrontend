import { test, expect } from '@playwright/test'
import type { Chart } from '../src/api/types'
import { selectValue } from './ui-helpers'
const chart: Chart = {
  id: '1'.repeat(32),
  ownerId: 'fixture-user',
  uploader: 'tester',
  title: '普通谱面预览',
  subtitle: '',
  maker: 'tester',
  bpm: 120,
  offset: 0,
  demoStart: 0,
  wave: 'music.ogg',
  description: '',
  createdAt: '2026-09-14T12:00:00Z',
  duration: 10,
  encoding: 'utf-8',
  tjaName: 'chart.tja',
  audioName: 'music.ogg',
  tjaHash: 'a'.repeat(64),
  audioHash: 'b'.repeat(64),
  audioSize: 100,
  titleTranslations: {},
  subtitleTranslations: {},
  isSingle: true,
  difficulties: ['Easy', 'Normal', 'Hard', 'Oni', 'Edit'].map((course, blockIndex) => ({
    course,

    level: 5,

    maker: '',
  })),
}

for (const signedIn of [false, true]) {
  test(`advanced search preserves filters and owner across pagination (${signedIn ? 'member' : 'guest'})`, async ({
    page,
  }) => {
    const requests: URL[] = []
    await page.route('**/api/v1/**', (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/v1/me')
        return route.fulfill({
          json: {
            user: signedIn
              ? { id: 'fixture-user', nickname: '测试用户', language: 'zh-Hans', isAdmin: false }
              : null,
            csrfToken: '',
          },
        })
      if (url.pathname === '/api/v1/charts') {
        requests.push(url)
        return route.fulfill({
          json: {
            items: [chart],
            total: 25,
            page: Number(url.searchParams.get('page') || 1),
            pageSize: 12,
          },
        })
      }
      return route.fulfill({ json: { items: [] } })
    })
    await page.goto('/?owner=fixture-user')
    const toggle = page.getByRole('button', { name: '高级搜索' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await selectValue(page, '筛选难度', 'Oni')
    await selectValue(page, '星级', '8')
    await selectValue(page, '显示顺序', 'unfc')
    await page.getByRole('searchbox').fill('太鼓 & test')
    await expect.poll(() => requests.at(-1)?.searchParams.get('q')).toBe('太鼓 & test')
    await page.getByRole('button', { name: '下一页', exact: true }).click()
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('2')
    expect(Object.fromEntries(requests.at(-1)!.searchParams)).toMatchObject({
      q: '太鼓 & test',
      course: 'Oni',
      level: '8',
      order: 'unfc',
      owner: 'fixture-user',
      page: '2',
    })
    if (!signedIn)
      await expect(page.getByText('登录后可按个人成绩', { exact: false })).toBeVisible()
    await toggle.click()
    await expect(page.getByRole('combobox', { name: '星级' })).toBeHidden()
    await expect(page.getByText('★ 8 ·', { exact: false })).toBeVisible()
    await page.reload()
    await toggle.click()
    await expect(page.getByRole('combobox', { name: '星级' })).toHaveAttribute('data-value', '8')
    await selectValue(page, '显示顺序', 'unperfect')
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('1')
    await page.goBack()
    await expect(page.getByRole('combobox', { name: '显示顺序' })).toHaveAttribute(
      'data-value',
      'unfc',
    )
    await page.getByRole('button', { name: '重置筛选' }).click()
    await expect.poll(() => requests.at(-1)?.searchParams.get('level')).toBe('')
    expect(Object.fromEntries(requests.at(-1)!.searchParams)).toMatchObject({
      q: '太鼓 & test',
      course: '',
      level: '',
      order: '',
      owner: 'fixture-user',
      page: '1',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}
