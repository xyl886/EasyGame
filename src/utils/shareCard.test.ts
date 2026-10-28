// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  fileNameFor,
  shareLinkFor,
  shareTextFor,
  shareTitleFor,
  shareUrl,
  type ShareCardData,
} from './shareCard'

const card: ShareCardData = {
  gameId: '2048',
  gameName: '2048',
  glyph: '2048',
  title: '4096 分',
  subtitle: '4×4 · 普通',
  stats: [
    { label: '最高分', value: '8192' },
    { label: '目标', value: '2048' },
  ],
  footer: '再挑战一次',
  route: '/game/2048',
}

describe('成绩分享文案', () => {
  it('分享链接带 hash 路由', () => {
    expect(shareUrl('/game/2048')).toBe(`${location.origin}${location.pathname}#/game/2048`)
    expect(shareLinkFor(card)).toContain('#/game/2048')
  })

  it('文案包含游戏名、标题、战绩与挑战链接', () => {
    const text = shareTextFor(card)
    expect(text).toContain('EasyGame 的2048')
    expect(text).toContain('4096 分')
    expect(text).toContain('4×4 · 普通')
    expect(text).toContain('最高分 8192')
    expect(text).toContain('再挑战一次')
    expect(text).toContain('#/game/2048')
  })

  it('分享标题简洁可读', () => {
    expect(shareTitleFor(card)).toBe('EasyGame · 2048 4096 分')
  })

  it('文件名包含游戏 id 与日期，且不含非法字符', () => {
    const name = fileNameFor({ ...card, gameId: 'klotski-classic' }, new Date(2026, 9, 28))
    expect(name).toBe('easygame-klotski-classic-20261028.png')
  })
})
