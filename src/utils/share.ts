/**
 * 分享工具：Web Share API + 复制链接降级
 *
 * 降级链：navigator.share（系统分享面板）→ navigator.clipboard（复制链接）→ failed
 * GH Pages 为 HTTPS，两个 API 均可用；非安全上下文自动落到 failed。
 */

export interface SharePayload {
  title?: string
  text: string
  url?: string
}

export type ShareResult = 'shared' | 'copied' | 'failed'

/** 生成带 hash 路由的可分享绝对地址（如 https://host/EasyGame/#/game/2048） */
export function shareUrl(route: string): string {
  const base = `${location.origin}${location.pathname}`
  const hash = route.startsWith('#') ? route : `#${route}`
  return `${base}${hash}`
}

/** 各游戏的分享文案（带成绩） */
export function gameShareText(
  gameId: '2048' | 'snake' | 'tetris',
  score: number,
  lines?: number,
  won?: boolean,
): string {
  switch (gameId) {
    case '2048':
      return won
        ? `我在 EasyGame 玩 2048 合成了 2048！得分 ${score}，来挑战我！🎯`
        : `我在 EasyGame 玩 2048 得了 ${score} 分，来挑战我！🎯`
    case 'snake':
      return `我在 EasyGame 贪吃蛇拿了 ${score} 分，来挑战我！🐍`
    case 'tetris':
      return `我在 EasyGame 俄罗斯方块消了 ${lines ?? 0} 行、${score} 分，来挑战我！🧱`
  }
}

/** 分享或复制；返回实际发生的结果 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const url = payload.url ?? location.href
  const data: ShareData = {
    title: payload.title ?? 'EasyGame · 益智小游戏',
    text: payload.text,
    url,
  }
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share(data)
      return 'shared'
    } catch (err) {
      // 用户取消分享面板：不算失败
      if ((err as DOMException)?.name === 'AbortError') return 'shared'
      // 其余错误（如系统不支持该数据）→ 降级复制链接
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
