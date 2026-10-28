/** 联机对局预设快捷语（只传 id，不传自由文本，儿童场景更安全） */

export interface QuickMessage {
  id: string
  text: string
}

export const QUICK_MESSAGES: QuickMessage[] = [
  { id: 'gl', text: '加油！' },
  { id: 'nice', text: '好棋！' },
  { id: 'think', text: '想一下…' },
  { id: 'thanks', text: '承让' },
  { id: 'again', text: '再来一局？' },
  { id: 'gg', text: 'GG' },
  { id: 'laugh', text: '😄' },
  { id: 'oops', text: '哎呀' },
]

const QUICK_MAP = new Map(QUICK_MESSAGES.map((message) => [message.id, message.text]))

export function quickMessageText(id: string): string | null {
  return QUICK_MAP.get(id) ?? null
}

export function isValidQuickMessage(id: string): boolean {
  return QUICK_MAP.has(id)
}
