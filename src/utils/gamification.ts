import { parseISO, format, subDays, isValid } from 'date-fns'
import type { CurriculumItem, ProgressRecord } from '../types/database'

// ─── バッジ定義 ─────────────────────────────────────────
export interface Badge {
  id: string
  label: string
  description: string
  emoji: string
  color: string
  earned: boolean
  earnedAt?: string
}

const PHASE_MEDALS       = ['', '🥉', '🥈', '🥇', '🏆']
const PHASE_MEDAL_COLORS = ['', '#b45309', '#9ca3af', '#c8a96a', '#7c3aed']
const PHASE_NAMES        = ['', '導入', '会社・商品', '資金・土地', 'ヒアリング']

export function calcBadges(items: CurriculumItem[], progress: ProgressRecord[]): Badge[] {
  const badges: Badge[] = []

  // フェーズ合格バッジ（🥉🥈🥇🏆）
  for (const phase of [1, 2, 3, 4]) {
    const phItems = items.filter(i => i.phase === phase)
    if (phItems.length === 0) continue
    const completedRecs = phItems
      .map(i => progress.find(p => p.item_id === i.id && p.is_completed))
      .filter(Boolean) as ProgressRecord[]
    const earned = completedRecs.length === phItems.length
    const earnedAt = earned
      ? completedRecs
          .map(r => r.completed_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? undefined
      : undefined
    badges.push({
      id: `phase_${phase}`,
      label: `フェーズ${phase}合格`,
      description: `フェーズ${phase}「${PHASE_NAMES[phase]}」全項目クリア`,
      emoji: PHASE_MEDALS[phase],
      color: PHASE_MEDAL_COLORS[phase],
      earned,
      earnedAt,
    })
  }

  // 全完了「一人前」バッジ
  const allDone = items.length > 0 && items.every(i => progress.find(p => p.item_id === i.id && p.is_completed))
  badges.push({
    id: 'complete',
    label: '一人前',
    description: '全カリキュラム完了！',
    emoji: '⭐',
    color: '#c8a96a',
    earned: allDone,
  })

  return badges
}

// ─── ストリーク計算 ─────────────────────────────────────
export interface StreakInfo {
  streak: number        // 現在の連続日数
  weekDays: number      // 今週の学習日数（月〜今日）
  lastActive: string | null  // 最終学習日
}

export function calcStreak(progress: ProgressRecord[]): StreakInfo {
  const completedDates = progress
    .filter(p => p.is_completed && p.completed_at)
    .map(p => {
      try { return format(parseISO(p.completed_at!), 'yyyy-MM-dd') } catch { return null }
    })
    .filter(Boolean) as string[]

  const uniqueDates = [...new Set(completedDates)].sort()
  const lastActive = uniqueDates.at(-1) ?? null

  // 連続日数（今日 or 昨日から遡る）
  let streak = 0
  let checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  // 今日学習していなければ昨日から開始
  const todayStr = format(checkDate, 'yyyy-MM-dd')
  if (!uniqueDates.includes(todayStr)) {
    checkDate = subDays(checkDate, 1)
  }
  while (true) {
    const ds = format(checkDate, 'yyyy-MM-dd')
    if (uniqueDates.includes(ds)) {
      streak++
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  // 今週（月曜〜今日）の学習日数
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=日, 1=月
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = subDays(today, mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const weekDays = uniqueDates.filter(d => {
    const dt = parseISO(d)
    return isValid(dt) && dt >= monday && dt <= today
  }).length

  return { streak, weekDays, lastActive }
}

// ─── マイルストーン ─────────────────────────────────────
export const MILESTONES = [25, 50, 75, 100]

export function getNewMilestones(
  rate: number,
  prevRate: number,
  completedPhases: number[],
  prevCompletedPhases: number[],
  employeeId: string
): { type: 'rate' | 'phase'; value: number }[] {
  const storageKey = `milestones_${employeeId}`
  let shown: string[] = []
  try { shown = JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { /* noop */ }

  const result: { type: 'rate' | 'phase'; value: number }[] = []

  for (const m of MILESTONES) {
    const key = `rate_${m}`
    if (rate >= m && prevRate < m && !shown.includes(key)) {
      result.push({ type: 'rate', value: m })
      shown.push(key)
    }
  }

  for (const ph of [1, 2, 3, 4]) {
    const key = `phase_${ph}`
    if (completedPhases.includes(ph) && !prevCompletedPhases.includes(ph) && !shown.includes(key)) {
      result.push({ type: 'phase', value: ph })
      shown.push(key)
    }
  }

  if (result.length > 0) {
    try { localStorage.setItem(storageKey, JSON.stringify(shown)) } catch { /* noop */ }
  }
  return result
}

export function dismissMilestone(employeeId: string, type: string, value: number) {
  const storageKey = `milestones_${employeeId}`
  let shown: string[] = []
  try { shown = JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { /* noop */ }
  const key = `${type}_${value}`
  if (!shown.includes(key)) shown.push(key)
  try { localStorage.setItem(storageKey, JSON.stringify(shown)) } catch { /* noop */ }
}
