import { expect, test } from '@playwright/test'

test.describe('大厅', () => {
  test('展示 8 款游戏且不含隐藏关卡', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '游戏大厅' })).toBeVisible()
    await expect(page.locator('a[href*="/game/"]')).toHaveCount(8)
    await expect(page.getByText('共 8 款')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('三国华容道')
    await expect(page.getByText('已上线：')).toBeVisible()
  })

  test('每款游戏都能进入游戏页', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', '桌面项目校验全部 8 条路由')

    const ids = [
      '2048',
      'tetris',
      'minesweeper',
      'sudoku',
      'snake',
      'klotski',
      'lianliankan',
      'eliminate',
    ]

    for (const id of ids) {
      await page.goto(`/#/game/${id}`)
      await expect(page.locator('.eg-game-title')).not.toHaveText('')
    }
  })
})

test.describe('游戏页交互', () => {
  test('2048 可打开设置，Esc 关闭', async ({ page }) => {
    await page.goto('/#/game/2048')
    await expect(page.locator('.eg-game-title')).toHaveText('2048')

    await page.getByRole('button', { name: '设置' }).click()
    const dialog = page.getByRole('dialog', { name: '游戏设置' })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('隐藏关卡三国华容道可直接访问', async ({ page }) => {
    await page.goto('/#/game/klotski-classic')

    await expect(page.locator('.eg-game-title')).toContainText('三国华容道')
    await expect(page.getByText('自动演示')).toBeVisible()
  })
})

test.describe('PWA 静默更新', () => {
  test('注册 Service Worker 且不出现更新提示条', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1200)

    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null
      const reg = await navigator.serviceWorker.ready
      return { scope: reg.scope, active: Boolean(reg.active) }
    })

    expect(sw).not.toBeNull()
    expect(sw?.active).toBe(true)
    await expect(page.getByText('有新版本可用')).toHaveCount(0)
  })
})

test.describe('排行榜底部抽屉（移动端）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('贴底全宽显示并可关闭', async ({ page }) => {
    await page.goto('/#/game/2048')
    await page.getByRole('button', { name: '排行榜' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeLessThanOrEqual(4)
    expect(box!.width).toBeGreaterThanOrEqual(384)
    expect(box!.width).toBeLessThanOrEqual(392)
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(840)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
