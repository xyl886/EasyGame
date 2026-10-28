import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const IMPACT_BLOCKING = new Set(['serious', 'critical'])

test.beforeEach(async ({ page }) => {
  // 关闭入场动画，避免扫描到中间透明态造成假阳性
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function scan(page: Page) {
  await page.waitForTimeout(700)
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
}

async function expectNoBlockingViolations(page: Page, label: string) {
  const results = await scan(page)
  const blocking = results.violations.filter((v) => IMPACT_BLOCKING.has(v.impact ?? ''))

  expect(
    blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
    `${label} 存在严重可访问性问题`,
  ).toEqual([])
}

test.describe('可访问性（axe）', () => {
  test('大厅（浅色）', async ({ page }) => {
    await page.goto('/')
    await expectNoBlockingViolations(page, '大厅')
  })

  test('大厅（深色）', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expectNoBlockingViolations(page, '大厅深色')
  })

  test('2048 游戏页', async ({ page }) => {
    await page.goto('/#/game/2048')
    await expect(page.locator('.eg-game-title')).toHaveText('2048')
    await expectNoBlockingViolations(page, '2048')
  })

  test('设置弹层打开时', async ({ page }) => {
    await page.goto('/#/game/2048')
    await page.getByRole('button', { name: '设置' }).click()
    await expect(page.getByRole('dialog', { name: '游戏设置' })).toBeVisible()
    await expectNoBlockingViolations(page, '设置弹层')
  })

  test('排行榜底部抽屉（移动端）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/game/2048')
    await page.getByRole('button', { name: '排行榜' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoBlockingViolations(page, '排行榜抽屉')
  })
})
