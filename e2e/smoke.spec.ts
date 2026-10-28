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

test.describe('联机对战（五子棋）', () => {
  test('大厅有联机区块，五子棋/四子棋都可进入', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '联机对战' })).toBeVisible()
    await expect(page.locator('a[href*="/multiplayer/gomoku"]')).toHaveCount(1)
    await expect(page.locator('a[href*="/multiplayer/connect4"]')).toHaveCount(1)

    await page.locator('a[href*="/multiplayer/gomoku"]').click()
    await expect(page.locator('.eg-game-title')).toContainText('五子棋')
    await expect(page.getByRole('button', { name: '创建房间' })).toBeVisible()

    await page.goto('/#/multiplayer/connect4')
    await expect(page.locator('.eg-game-title')).toContainText('四子棋')
    await expect(page.getByRole('button', { name: '创建房间' })).toBeVisible()
  })

  test('本机双人：黑棋五连后显示获胜', async ({ page }) => {
    await page.goto('/#/multiplayer/gomoku')
    await page.getByRole('button', { name: '本机双人' }).click()

    const board = page.getByTestId('gomoku-board')
    await expect(board).toBeVisible()
    const cell = (row: number, col: number) => board.locator('button').nth(row * 15 + col)

    const black = [
      [7, 3],
      [7, 4],
      [7, 5],
      [7, 6],
      [7, 7],
    ]
    const white = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]

    for (let i = 0; i < black.length; i++) {
      await cell(black[i][0], black[i][1]).click()
      if (i < white.length) await cell(white[i][0], white[i][1]).click()
    }

    const result = page.getByTestId('room-result')
    await expect(result).toBeVisible()
    await expect(result).toContainText('黑棋获胜')
  })

  test('本机双人：四子棋先连成四子获胜', async ({ page }) => {
    await page.goto('/#/multiplayer/connect4')
    await page.getByRole('button', { name: '本机双人' }).click()

    const board = page.getByTestId('connect4-board')
    await expect(board).toBeVisible()
    const column = (col: number) => board.locator('button').nth(col)

    // 红方（先手）依次落 0/1/2/3 列，黄方落在 4/5/6 列
    for (const col of [0, 4, 1, 5, 2, 6, 3]) {
      await column(col).click()
    }

    const result = page.getByTestId('room-result')
    await expect(result).toBeVisible()
    await expect(result).toContainText('红方获胜')

    await page.getByRole('button', { name: '分享战绩' }).click()
    const shareSheet = page.getByTestId('share-sheet')
    await expect(shareSheet).toBeVisible()
    await expect(shareSheet.locator('img[alt="成绩分享卡片"]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(shareSheet).toBeHidden()
  })

  test('创建房间会生成 6 位房号并可离开', async ({ page }) => {
    await page.goto('/#/multiplayer/gomoku')
    await page.getByRole('button', { name: '创建房间' }).click()

    await expect(page.getByRole('button', { name: /^[A-HJ-NP-Z2-9]{6}$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '离开房间' })).toBeVisible()
    await page.getByRole('button', { name: '离开房间' }).click()
    await expect(page.getByRole('button', { name: '创建房间' })).toBeVisible()
  })
})
