/**
 * 游戏基类接口
 * 所有游戏逻辑引擎需实现此接口，便于统一管理和后续迁移
 */
export interface BaseGame<State, Move> {
  /** 获取当前游戏状态 */
  getState(): State
  /** 加载状态（用于恢复存档） */
  loadState(state: State): void
  /** 执行一步操作，返回是否发生变化 */
  move(direction: Move): boolean
  /** 当前是否游戏结束 */
  isGameOver(): boolean
  /** 当前是否胜利（达到目标） */
  isWin(): boolean
  /** 重置游戏 */
  reset(): void
  /** 当前分数 */
  getScore(): number
}
