import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // e2e 使用本地 MQTT broker，避免依赖公共 broker
  await page.addInitScript(() => {
    localStorage.setItem('easygame-room-broker', 'ws://127.0.0.1:8888/mqtt')
  })
})

test.describe('大厅', () => {
  test('展示 8 款游戏且不含隐藏关卡', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '游戏大厅' })).toBeVisible()
    await expect(page.locator('#lobby a[href*="/game/"]')).toHaveCount(8)
    await expect(page.getByText('共 8 款')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('三国华容道')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('经典益智')
    await page.locator('#multiplayer').scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: '公开房间' })).toBeVisible()
    await expect(page.getByText('暂无公开房间')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('已上线：')).toHaveCount(0)
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
    test.setTimeout(60_000)
    await page.goto('/')
    await page.waitForTimeout(1500)

    // 并行跑 e2e 时 SW 激活可能变慢，用超时 race 避免整个用例卡到超时
    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 20_000))
      return Promise.race([
        navigator.serviceWorker.ready.then((reg) => ({
          scope: reg.scope,
          active: Boolean(reg.active),
        })),
        timeout,
      ])
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
    await expect(page.locator('#multiplayer .grid a[href*="/multiplayer/gomoku"]')).toHaveCount(1)
    await expect(page.locator('#multiplayer .grid a[href*="/multiplayer/connect4"]')).toHaveCount(1)

    await page.locator('#multiplayer .grid a[href*="/multiplayer/gomoku"]').click()
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

  test('公开房间：A 创建，B 列表发现并申请，A 接受后同步落子', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', '双浏览器流程在桌面项目验证')

    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    for (const context of [contextA, contextB]) {
      await context.addInitScript(() => {
        localStorage.setItem('easygame-room-broker', 'ws://127.0.0.1:8888/mqtt')
      })
    }
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/#/multiplayer/gomoku')
    await pageA.getByRole('button', { name: '创建房间' }).click()
    const codeButton = pageA.getByRole('button', { name: /^[A-HJ-NP-Z2-9]{6}$/ })
    await expect(codeButton).toBeVisible()
    const code = (await codeButton.innerText()).trim()

    // B 从公开房间列表发现 A 的房间
    await pageB.goto('/')
    await pageB.locator('#multiplayer').scrollIntoViewIfNeeded()
    const roomCard = pageB.locator('[data-testid="public-room"]').filter({ hasText: code })
    await expect(roomCard).toBeVisible({ timeout: 15_000 })

    // B 申请加入，A 收到申请并接受
    await roomCard.getByRole('link', { name: '申请加入' }).click()
    await expect(pageB.getByTestId('approval-state')).toContainText('等待房主同意')

    const requests = pageA.getByTestId('join-requests')
    await expect(requests).toBeVisible({ timeout: 10_000 })
    await requests.getByRole('button', { name: '接受' }).click()

    // 接受后 B 进入同一局，A 落子 B 同步
    await expect(pageB.getByTestId('gomoku-board')).toBeVisible({ timeout: 10_000 })
    await pageA.getByTestId('gomoku-board').locator('button').nth(112).click()
    await expect(pageB.getByTestId('gomoku-board').locator('.gomoku-stone')).toHaveCount(1, {
      timeout: 10_000,
    })

    // 刷新后 URL 仍带 request=1，应凭 token 直接恢复，而不是重新排队审批
    await pageB.reload()
    await expect(pageB.getByTestId('gomoku-board')).toBeVisible({ timeout: 10_000 })
    await expect(pageB.getByTestId('gomoku-board').locator('.gomoku-stone')).toHaveCount(1)
    await expect(pageB.getByTestId('approval-state')).toHaveCount(0)

    await contextA.close()
    await contextB.close()
  })

  test('公开房间：房主拒绝后访客看到拒绝提示', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', '双浏览器流程在桌面项目验证')

    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    for (const context of [contextA, contextB]) {
      await context.addInitScript(() => {
        localStorage.setItem('easygame-room-broker', 'ws://127.0.0.1:8888/mqtt')
      })
    }
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/#/multiplayer/gomoku')
    await pageA.getByRole('button', { name: '创建房间' }).click()
    const codeButton = pageA.getByRole('button', { name: /^[A-HJ-NP-Z2-9]{6}$/ })
    await expect(codeButton).toBeVisible()
    const code = (await codeButton.innerText()).trim()

    await pageB.goto('/')
    await pageB.locator('#multiplayer').scrollIntoViewIfNeeded()
    const roomCard = pageB.locator('[data-testid="public-room"]').filter({ hasText: code })
    await expect(roomCard).toBeVisible({ timeout: 15_000 })
    await roomCard.getByRole('link', { name: '申请加入' }).click()

    const requests = pageA.getByTestId('join-requests')
    await expect(requests).toBeVisible({ timeout: 10_000 })
    await requests.getByRole('button', { name: '拒绝' }).click()

    await expect(pageB.getByTestId('approval-state')).toContainText('申请被拒绝', {
      timeout: 10_000,
    })
    await expect(pageB.getByText('房主拒绝了申请')).toBeVisible()

    await contextA.close()
    await contextB.close()
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
