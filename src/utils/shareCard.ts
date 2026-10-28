/** 成绩分享卡片：生成可保存/可分享的图片，而不只是复制链接 */

export interface ShareStat {
  label: string
  value: string
}

export interface ShareCardData {
  /** 游戏 id，用于文件名与文案 */
  gameId: string
  /** 游戏名（如 2048、五子棋） */
  gameName: string
  /** 卡片主标题（如「2048 分」「你赢了」） */
  title: string
  /** 副标题（配置/难度/时间等） */
  subtitle?: string
  /** 最多 4 项战绩 */
  stats?: ShareStat[]
  /** 底部一句补充（如「本机段位 +18」） */
  footer?: string
  /** 游戏路由，用于二维码与链接 */
  route: string
  /** 顶部装饰字 */
  glyph?: string
}

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1440
const BG = '#f5f4ed'
const PAPER = '#faf9f5'
const INK = '#141413'
const MUTED = '#5e5d59'
const FAINT = '#6e6d66'
const LINE = '#e0dccf'
const ACCENT = '#b5543a'
const SERIF = '"Songti SC", "STSong", "Noto Serif CJK SC", Georgia, serif'
const SANS = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif'

/** 分享链接（绝对地址，带 hash 路由） */
export function shareUrl(route: string): string {
  const base = `${location.origin}${location.pathname}`
  const hash = route.startsWith('#') ? route : `#${route}`
  return `${base}${hash}`
}

export function shareLinkFor(card: Pick<ShareCardData, 'route'>): string {
  return shareUrl(card.route)
}

export function shareTextFor(card: ShareCardData): string {
  const parts = [`我在 EasyGame 的${card.gameName}：${card.title}`]
  if (card.subtitle) parts.push(card.subtitle)
  if (card.stats?.length) {
    parts.push(card.stats.map((s) => `${s.label} ${s.value}`).join(' · '))
  }
  if (card.footer) parts.push(card.footer)
  parts.push(`来挑战我！${shareLinkFor(card)}`)
  return parts.join('｜')
}

export function shareTitleFor(card: ShareCardData): string {
  return `EasyGame · ${card.gameName} ${card.title}`
}

export function fileNameFor(card: ShareCardData, now = new Date()): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const safeId = card.gameId.replace(/[^a-z0-9-]/gi, '')
  return `easygame-${safeId}-${date}.png`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2,
): string[] {
  const lines: string[] = []
  let current = ''
  for (const char of Array.from(text)) {
    const next = current + char
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = char
      if (lines.length >= maxLines) break
    } else {
      current = next
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

async function drawQrCode(ctx: CanvasRenderingContext2D, url: string, size: number): Promise<void> {
  try {
    const { default: QRCode } = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: size * 2,
      color: { dark: INK, light: PAPER },
    })
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    ctx.drawImage(image, 0, 0, size, size)
  } catch {
    // QR 生成失败不影响主卡片
  }
}

/** 画一张 1080×1440 的成绩卡片，返回 PNG Blob */
export async function renderShareCard(card: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')

  // 背景
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 纸面
  ctx.fillStyle = PAPER
  roundRect(ctx, 48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96, 36)
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.stroke()

  // 顶部品牌
  ctx.fillStyle = INK
  ctx.font = `600 40px ${SERIF}`
  ctx.fillText('EasyGame', 108, 168)
  ctx.fillStyle = FAINT
  ctx.font = `400 20px ${SANS}`
  ctx.fillText('益智小游戏集合', 108, 204)

  // 装饰字
  if (card.glyph) {
    ctx.fillStyle = 'rgba(181, 84, 58, 0.08)'
    ctx.font = `500 220px ${SERIF}`
    ctx.textAlign = 'right'
    ctx.fillText(card.glyph, CARD_WIDTH - 108, 300)
    ctx.textAlign = 'left'
  }

  // 游戏名 overline
  ctx.fillStyle = ACCENT
  ctx.font = `600 24px ${SANS}`
  ctx.fillText(card.gameName.toUpperCase(), 108, 360)

  // 主标题（自动换行，最多两行）
  ctx.fillStyle = INK
  ctx.font = `600 96px ${SERIF}`
  const titleLines = wrapText(ctx, card.title, CARD_WIDTH - 216, 2)
  let y = 470
  for (const line of titleLines) {
    ctx.fillText(line, 108, y)
    y += 116
  }

  // 副标题
  if (card.subtitle) {
    ctx.fillStyle = MUTED
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(card.subtitle, 108, y + 6)
    y += 60
  }

  // 战绩卡片
  const stats = (card.stats ?? []).slice(0, 4)
  if (stats.length) {
    const boxTop = Math.max(y + 48, 720)
    const boxHeight = 96
    const gap = 20
    const boxWidth = (CARD_WIDTH - 216 - gap) / 2
    stats.forEach((stat, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 108 + col * (boxWidth + gap)
      const top = boxTop + row * (boxHeight + gap)
      ctx.fillStyle = '#f1efe3'
      roundRect(ctx, x, top, boxWidth, boxHeight, 20)
      ctx.fill()
      ctx.strokeStyle = LINE
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = FAINT
      ctx.font = `400 20px ${SANS}`
      ctx.fillText(stat.label, x + 26, top + 38)
      ctx.fillStyle = INK
      ctx.font = `600 38px ${SANS}`
      const value = stat.value.length > 14 ? `${stat.value.slice(0, 13)}…` : stat.value
      ctx.fillText(value, x + 26, top + 76)
    })
  }

  // 底部补充
  if (card.footer) {
    ctx.fillStyle = ACCENT
    ctx.font = `500 24px ${SANS}`
    ctx.fillText(card.footer, 108, CARD_HEIGHT - 300)
  }

  // 左下：扫码来玩 + 链接
  ctx.fillStyle = MUTED
  ctx.font = `500 26px ${SANS}`
  ctx.fillText('扫码来挑战', 108, CARD_HEIGHT - 236)
  ctx.fillStyle = FAINT
  ctx.font = `400 19px ${SANS}`
  ctx.fillText(shareLinkFor(card).replace(/^https?:\/\//, ''), 108, CARD_HEIGHT - 196)
  ctx.fillStyle = FAINT
  ctx.font = `400 18px ${SANS}`
  ctx.fillText('即开即玩 · 无需安装 · 离线可玩', 108, CARD_HEIGHT - 152)

  // 右下：二维码
  const qrSize = 176
  const qrX = CARD_WIDTH - 108 - qrSize
  const qrY = CARD_HEIGHT - 152 - qrSize
  ctx.fillStyle = PAPER
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14)
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.stroke()
  ctx.save()
  ctx.translate(qrX, qrY)
  await drawQrCode(ctx, shareLinkFor(card), qrSize)
  ctx.restore()

  // 底部署名
  ctx.fillStyle = FAINT
  ctx.font = `400 16px ${SANS}`
  ctx.textAlign = 'right'
  ctx.fillText('EasyGame · MIT', CARD_WIDTH - 108, CARD_HEIGHT - 110)
  ctx.textAlign = 'left'

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas-to-blob-failed'))
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
