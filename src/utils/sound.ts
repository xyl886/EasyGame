/**
 * 音效管理器（Web Audio API 合成音效）
 *
 * - 纯 TS 实现，零音频资源文件，用振荡器 + 增益包络实时合成
 * - AudioContext 首次由用户手势触发时惰性创建（浏览器自动播放策略）
 * - 开关状态经 StorageAdapter 持久化（easygame-sound-enabled，默认开启）
 * - 所有音效失败静默降级，不影响游戏
 *
 * 后续迁移小程序时：本模块替换为 wx.createInnerAudioContext 或相同合成逻辑即可。
 */
import {StorageAdapter} from '../adapters/StorageAdapter'

export type SoundName =
    | 'click' // 按钮点击
    | 'move' // 2048 滑动 / 蛇转向 / 方块移动
    | 'merge' // 2048 数字合并
    | 'eat' // 蛇吃到食物
    | 'rotate' // 方块旋转
    | 'drop' // 方块硬降
    | 'line' // 消行
    | 'win' // 通关
    | 'over' // 游戏结束
    | 'start' // 开局
    | 'pause' // 暂停

const ENABLED_KEY = 'easygame-sound-enabled'

/** 单音定义：频率 / 相对延迟 / 时长 / 波形 / 音量 / 终点频率（扫频） */
interface ToneSpec {
    freq: number
    delay: number
    dur: number
    type?: OscillatorType
    vol?: number
    endFreq?: number
}

/** 每个音效 = 一组按时间轴排列的音 */
type EffectSpec = ToneSpec[]

const EFFECTS: Record<SoundName, EffectSpec> = {
    click: [{freq: 640, delay: 0, dur: 0.05, type: 'triangle', vol: 0.12}],
    move: [{freq: 300, delay: 0, dur: 0.04, type: 'triangle', vol: 0.08}],
    merge: [
        {freq: 523, delay: 0, dur: 0.09, type: 'sine', vol: 0.18},
        {freq: 784, delay: 0.05, dur: 0.14, type: 'sine', vol: 0.16},
    ],
    eat: [{freq: 660, delay: 0, dur: 0.08, type: 'sine', vol: 0.15, endFreq: 990}],
    rotate: [{freq: 440, delay: 0, dur: 0.05, type: 'square', vol: 0.06}],
    drop: [{freq: 200, delay: 0, dur: 0.1, type: 'square', vol: 0.14, endFreq: 90}],
    line: [
        {freq: 660, delay: 0, dur: 0.08, type: 'sine', vol: 0.14},
        {freq: 880, delay: 0.06, dur: 0.1, type: 'sine', vol: 0.14},
        {freq: 1175, delay: 0.13, dur: 0.16, type: 'sine', vol: 0.16},
    ],
    win: [
        {freq: 523, delay: 0, dur: 0.15, type: 'sine', vol: 0.16},
        {freq: 659, delay: 0.08, dur: 0.15, type: 'sine', vol: 0.16},
        {freq: 784, delay: 0.16, dur: 0.15, type: 'sine', vol: 0.16},
        {freq: 1047, delay: 0.24, dur: 0.28, type: 'sine', vol: 0.18},
    ],
    over: [
        {freq: 380, delay: 0, dur: 0.35, type: 'sawtooth', vol: 0.12, endFreq: 190},
        {freq: 240, delay: 0.05, dur: 0.4, type: 'sine', vol: 0.1, endFreq: 120},
    ],
    start: [{freq: 440, delay: 0, dur: 0.12, type: 'sine', vol: 0.15, endFreq: 660}],
    pause: [
        {freq: 500, delay: 0, dur: 0.06, type: 'sine', vol: 0.1},
        {freq: 350, delay: 0.08, dur: 0.08, type: 'sine', vol: 0.1},
    ],
}

class SoundManager {
    private ctx: AudioContext | null = null
    private _enabled = StorageAdapter.get<boolean>(ENABLED_KEY) ?? true

    get enabled(): boolean {
        return this._enabled
    }

    setEnabled(v: boolean): void {
        this._enabled = v
        StorageAdapter.set(ENABLED_KEY, v)
    }

    toggle(): boolean {
        this.setEnabled(!this._enabled)
        return this._enabled
    }

    /** 惰性创建/恢复 AudioContext；不可用时返回 null（静默降级） */
    private ensureCtx(): AudioContext | null {
        if (!this._enabled) return null
        try {
            const w = window as unknown as {
                AudioContext?: typeof AudioContext
                webkitAudioContext?: typeof AudioContext
            }
            const Ctor = w.AudioContext ?? w.webkitAudioContext
            if (!Ctor) return null
            if (!this.ctx) this.ctx = new Ctor()
            if (this.ctx.state === 'suspended') {
                // 恢复上下文（用户手势后浏览器允许），失败静默
                void this.ctx.resume().catch(() => {
                })
            }
            return this.ctx
        } catch {
            return null
        }
    }

    play(name: SoundName): void {
        const ctx = this.ensureCtx()
        if (!ctx) return
        const spec = EFFECTS[name]
        if (!spec) return
        try {
            const t0 = ctx.currentTime
            for (const t of spec) {
                this.tone(ctx, t, t0)
            }
        } catch {
            // 音效失败不影响游戏
        }
    }

    private tone(ctx: AudioContext, t: ToneSpec, t0: number): void {
        const start = t0 + t.delay
        const dur = t.dur
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = t.type ?? 'sine'
        osc.frequency.setValueAtTime(t.freq, start)
        if (t.endFreq && t.endFreq !== t.freq) {
            osc.frequency.exponentialRampToValueAtTime(t.endFreq, start + dur)
        }
        const vol = t.vol ?? 0.15
        // 包络：快速起音 + 指数衰减，避免爆音
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(vol, start + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + dur + 0.03)
    }
}

/** 全局单例 */
export const sound = new SoundManager()
