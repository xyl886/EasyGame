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
