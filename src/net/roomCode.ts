/** 房号工具：6 位、去除易混字符（0/O/1/I），peer id 由房号派生 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6
const PEER_PREFIX = 'easygame-gomoku-'

/** 使用注入的随机源便于测试；默认 Math.random */
export function generateRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.floor(random() * ALPHABET.length)
    code += ALPHABET[index] ?? ALPHABET[0]
  }
  return code
}

/** 归一化用户输入：去空格/连接符、转大写、只保留合法字符、截断 6 位 */
export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s|-/g, '')
    .split('')
    .filter((ch) => ALPHABET.includes(ch))
    .join('')
    .slice(0, ROOM_CODE_LENGTH)
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && code.split('').every((ch) => ALPHABET.includes(ch))
}

export function peerIdFor(code: string): string {
  return `${PEER_PREFIX}${code}`
}

/** 邀请链接：hash 路由 + room 查询参数，打开后自动加入 */
export function inviteUrl(code: string, location: { origin: string; pathname: string }): string {
  return `${location.origin}${location.pathname}#/multiplayer/gomoku?room=${code}`
}
