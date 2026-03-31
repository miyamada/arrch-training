import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Employee, CurriculumItem, ProgressRecord, ProgressComment } from '../types/database'
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Star, Video, User, BookOpen, Wrench, ExternalLink, MessageSquare, ChevronLeft, ChevronRight as ChevronRightIcon, Calendar, CheckCircle, FileText, Save, Bot, Flame, Trophy } from 'lucide-react'
import { Breadcrumb } from '../components/Layout'
import AiChat from '../components/AiChat'
import AiSummary from '../components/AiSummary'
import type { DailyReport } from '../types/database'
import { calcBadges, calcStreak, getNewMilestones } from '../utils/gamification'

const TRAINER_TYPE_ICON = {
  self: <BookOpen size={13} color="#4b5563" />,
  trainer: <User size={13} color="#c8a96a" />,
  mentor: <Wrench size={13} color="#5a8faa" />,
}
const TRAINER_TYPE_LABEL = { self: '自己学習', trainer: '教育担当', mentor: 'メンター' }
const PHASE_NAMES = ['', '導入', '会社・商品', '資金・土地', 'ヒアリング']

// ── コメントパネル ──────────────────────────────────────
function CommentPanel({ record, authorId, isAdmin }: {
  record: ProgressRecord
  authorId: string
  isAdmin: boolean
}) {
  const [comments, setComments] = useState<ProgressComment[]>([])
  const [authors, setAuthors] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('progress_comments')
        .select('*')
        .eq('record_id', record.id)
        .order('created_at', { ascending: true })
      if (data) {
        setComments(data)
        const ids = [...new Set(data.map(c => c.author_id))]
        if (ids.length > 0) {
          const { data: emps } = await supabase.from('employees').select('id, name').in('id', ids)
          if (emps) setAuthors(Object.fromEntries(emps.map(e => [e.id, e.name])))
        }
      }
    }
    load()
  }, [record.id])

  async function addComment() {
    if (!text.trim()) return
    setSaving(true)
    const { data } = await supabase.from('progress_comments').insert({
      record_id: record.id,
      author_id: authorId,
      content: text.trim(),
    }).select().single()
    if (data) {
      setComments(prev => [...prev, data])
      setAuthors(prev => ({ ...prev, [authorId]: prev[authorId] ?? '自分' }))
    }
    setText('')
    setSaving(false)
  }

  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid #d1d5db', paddingTop: '10px' }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ fontSize: '11px', background: '#eef0f3', borderRadius: '4px', padding: '6px 10px' }}>
              <span style={{ color: '#c8a96a', fontWeight: 600 }}>{authors[c.author_id] ?? '—'}</span>
              <span style={{ color: '#6b7280', marginLeft: '8px' }}>{format(parseISO(c.created_at), 'M/d HH:mm')}</span>
              <div style={{ color: '#374151', marginTop: '2px' }}>{c.content}</div>
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment()}
            placeholder="コメントを追加（Enter送信）"
            style={{
              flex: 1, fontSize: '11px', padding: '5px 8px',
              background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px',
              color: '#111827', outline: 'none',
            }}
          />
          <button
            onClick={addComment}
            disabled={saving || !text.trim()}
            style={{ padding: '5px 12px', fontSize: '11px', background: '#c8a96a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >送信</button>
        </div>
      )}
    </div>
  )
}

// ── カレンダービュー ────────────────────────────────────
function CalendarView({ items, progress }: { items: CurriculumItem[], progress: ProgressRecord[] }) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDow = getDay(monthStart)

  const byDate: Record<string, { item: CurriculumItem; rec: ProgressRecord }[]> = {}
  for (const rec of progress) {
    if (!rec.planned_date) continue
    const key = rec.planned_date
    if (!byDate[key]) byDate[key] = []
    const item = items.find(i => i.id === rec.item_id)
    if (item) byDate[key].push({ item, rec })
  }

  const DOW = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#4b5563' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', minWidth: '120px', textAlign: 'center' }}>
          {format(current, 'yyyy年M月', { locale: ja })}
        </span>
        <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#4b5563' }}>
          <ChevronRightIcon size={14} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: i === 0 ? '#e05454' : i === 6 ? '#5a8faa' : '#6b7280', padding: '4px' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: '64px' }} />
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const entries = byDate[key] ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div key={key} style={{
              minHeight: '64px', padding: '4px',
              background: isToday ? 'rgba(200,169,106,0.08)' : '#ffffff',
              border: `1px solid ${isToday ? '#c8a96a' : '#d1d5db'}`,
              borderRadius: '4px',
            }}>
              <div style={{ fontSize: '11px', color: isToday ? '#c8a96a' : '#4b5563', fontWeight: isToday ? 700 : 400, marginBottom: '2px' }}>
                {day.getDate()}
              </div>
              {entries.slice(0, 2).map(({ item, rec }) => (
                <div key={item.id} style={{
                  fontSize: '9px', padding: '1px 4px', borderRadius: '2px', marginBottom: '1px',
                  background: rec.is_completed ? 'rgba(74,158,92,0.12)' : 'rgba(200,169,106,0.12)',
                  color: rec.is_completed ? '#4a9e5c' : '#b8941a',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {item.content.slice(0, 12)}…
                </div>
              ))}
              {entries.length > 2 && (
                <div style={{ fontSize: '9px', color: '#6b7280' }}>+{entries.length - 2}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { employee: me } = useAuth()
  const isAdmin = me?.role === 'admin'
  const today = new Date()

  const [emp, setEmp] = useState<Employee | null>(null)
  const [mentor, setMentor] = useState<Employee | null>(null)
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [admins, setAdmins] = useState<Employee[]>([])
  const [activePhase, setActivePhase] = useState<number | 'calendar' | 'reports' | 'ai'>(1)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [reportForm, setReportForm] = useState({ goal_and_achievement: '', learned_today: '', tomorrow_goal: '' })
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportSaving, setReportSaving] = useState(false)
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [loading, setLoading] = useState(true)
  const [milestone, setMilestone] = useState<{ type: 'rate' | 'phase'; value: number } | null>(null)
  const prevRateRef = useRef<number>(0)
  const prevPhasesRef = useRef<number[]>([])

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const targetId = id ?? me?.id

  useEffect(() => {
    if (!targetId) return
    async function load() {
      const [{ data: empData }, { data: currItems }, { data: prog }, { data: adminData }, { data: reportData }] = await Promise.all([
        supabase.from('employees').select('*').eq('id', targetId!).single(),
        supabase.from('curriculum_items').select('*').order('phase').order('sort_order'),
        supabase.from('progress_records').select('*').eq('employee_id', targetId!),
        supabase.from('employees').select('*').eq('role', 'admin'),
        supabase.from('daily_reports').select('*').eq('employee_id', targetId!).order('report_date', { ascending: false }),
      ])
      setEmp(empData)
      setItems(currItems ?? [])
      setProgress(prog ?? [])
      setAdmins(adminData ?? [])
      setReports(reportData ?? [])
      if (empData?.mentor_id) {
        const { data: m } = await supabase.from('employees').select('*').eq('id', empData.mentor_id).single()
        setMentor(m)
      }
      setLoading(false)
    }
    load()
  }, [targetId])

  async function toggleComplete(itemId: string) {
    const rec = progress.find(p => p.item_id === itemId)
    if (!rec) return
    const nowCompleted = !rec.is_completed
    const { data } = await supabase
      .from('progress_records')
      .update({ is_completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null })
      .eq('id', rec.id).select().single()
    if (data) {
      const newProgress = progress.map(p => p.id === rec.id ? data : p)
      setProgress(newProgress)
      // マイルストーン検知
      if (nowCompleted && emp) {
        const newTotal = items.length
        const newCompleted = newProgress.filter(p => p.is_completed).length
        const newRate = newTotal > 0 ? Math.round((newCompleted / newTotal) * 100) : 0
        const newPhases = [1, 2, 3, 4].filter(ph => {
          const phItems = items.filter(i => i.phase === ph)
          return phItems.length > 0 && phItems.every(i => newProgress.find(p => p.item_id === i.id && p.is_completed))
        })
        const found = getNewMilestones(newRate, prevRateRef.current, newPhases, prevPhasesRef.current, emp.id)
        if (found.length > 0) setMilestone(found[0])
        prevRateRef.current = newRate
        prevPhasesRef.current = newPhases
      }
    }
  }

  async function toggleTestPassed(itemId: string) {
    const rec = progress.find(p => p.item_id === itemId)
    if (!rec || !isAdmin) return
    const nowPassed = !rec.is_test_passed
    const { data } = await supabase
      .from('progress_records')
      .update({ is_test_passed: nowPassed })
      .eq('id', rec.id).select().single()
    if (data) setProgress(prev => prev.map(p => p.id === rec.id ? data : p))
  }

  async function updateField(itemId: string, field: 'planned_date' | 'trainer_name' | 'memo', value: string) {
    const rec = progress.find(p => p.item_id === itemId)
    if (!rec) return
    const { data } = await supabase
      .from('progress_records')
      .update({ [field]: value || null })
      .eq('id', rec.id).select().single()
    if (data) setProgress(prev => prev.map(p => p.id === rec.id ? data : p))
  }

  async function saveReport() {
    if (!targetId) return
    setReportSaving(true)
    const payload = {
      employee_id: targetId,
      report_date: selectedDate,
      goal_and_achievement: reportForm.goal_and_achievement,
      learned_today: reportForm.learned_today,
      tomorrow_goal: reportForm.tomorrow_goal,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase
      .from('daily_reports')
      .upsert(payload, { onConflict: 'employee_id,report_date' })
      .select().single()
    if (data) {
      setReports(prev => {
        const exists = prev.findIndex(r => r.report_date === selectedDate)
        return exists >= 0 ? prev.map((r, i) => i === exists ? data : r) : [data, ...prev]
      })
    }
    setReportSaving(false)
  }

  function selectReport(r: DailyReport) {
    setSelectedDate(r.report_date)
    setReportForm({ goal_and_achievement: r.goal_and_achievement, learned_today: r.learned_today, tomorrow_goal: r.tomorrow_goal })
  }

  // 選択日付が変わったとき既存の日報をロード
  function onDateChange(date: string) {
    setSelectedDate(date)
    const existing = reports.find(r => r.report_date === date)
    setReportForm(existing ? { goal_and_achievement: existing.goal_and_achievement, learned_today: existing.learned_today, tomorrow_goal: existing.tomorrow_goal } : { goal_and_achievement: '', learned_today: '', tomorrow_goal: '' })
  }

  function toggleComment(recId: string) {
    setOpenComments(prev => {
      const next = new Set(prev)
      next.has(recId) ? next.delete(recId) : next.add(recId)
      return next
    })
  }

  if (loading) return <div style={{ padding: '40px', color: '#4b5563' }}>読み込み中...</div>
  if (!emp) return <div style={{ padding: '40px', color: '#e05454' }}>社員が見つかりません</div>

  const total = items.length
  const completed = progress.filter(p => p.is_completed).length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  const phaseStats = [1, 2, 3, 4].map(ph => {
    const phItems = items.filter(i => i.phase === ph)
    const phCompleted = phItems.filter(i => progress.find(p => p.item_id === i.id && p.is_completed)).length
    return { phase: ph, total: phItems.length, completed: phCompleted }
  })

  const phaseItems = typeof activePhase === 'number' ? items.filter(i => i.phase === activePhase) : []

  // ゲーミフィケーション計算
  const badges = calcBadges(items, progress)
  const streak = calcStreak(progress)
  // prevRateRef初期化（loading完了時に一度だけ）
  if (prevRateRef.current === 0 && rate > 0 && !milestone) {
    prevRateRef.current = rate
    prevPhasesRef.current = phaseStats.filter(s => s.completed === s.total && s.total > 0).map(s => s.phase)
  }

  // ── マイルストーンオーバーレイ ──
  const MilestoneCelebration = milestone && (
    <div
      onClick={() => setMilestone(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '16px', padding: '40px 48px',
          textAlign: 'center', maxWidth: '360px', width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.35s ease',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '12px', lineHeight: 1 }}>
          {milestone.type === 'rate' && milestone.value === 100 ? '⭐' :
           milestone.type === 'rate' ? '🎉' : '🏅'}
        </div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          {milestone.type === 'rate'
            ? `${milestone.value}% 達成！`
            : `フェーズ${milestone.value} 完了！`}
        </div>
        <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '28px', lineHeight: 1.6 }}>
          {milestone.type === 'rate' && milestone.value === 25 && 'スタートダッシュ！この調子で続けよう 🚀'}
          {milestone.type === 'rate' && milestone.value === 50 && '折り返し地点！後半戦も頑張ろう 💪'}
          {milestone.type === 'rate' && milestone.value === 75 && 'ゴールが見えてきた！あと一息 🌟'}
          {milestone.type === 'rate' && milestone.value === 100 && '全カリキュラム完了！お疲れさまでした ✨'}
          {milestone.type === 'phase' && `フェーズ${milestone.value}「${'導入・会社・商品・資金・土地・ヒアリング'.split('・')[milestone.value - 1]}」をマスターしました！`}
        </div>
        <button
          onClick={() => setMilestone(null)}
          style={{
            padding: '12px 32px', background: '#c8a96a', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(200,169,106,0.4)',
          }}
        >
          やったー！
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 40px' }}>
      {MilestoneCelebration}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <Breadcrumb items={[{ label: 'ダッシュボード', to: '/' }, { label: emp.name }]} />

      {/* ヘッダー */}
      <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '24px 28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>{emp.name}</h1>
            <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
              入社日: {format(parseISO(emp.joined_at), 'yyyy年M月d日')}
            </div>
            {mentor && (
              <div style={{ fontSize: '12px', color: '#4b5563' }}>
                担当メンター: <span style={{ color: '#c8a96a' }}>{mentor.name}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '48px', fontWeight: 700, color: '#c8a96a', lineHeight: 1 }}>{rate}%</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{completed}/{total} 項目完了</div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setAiChatOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', background: '#c8a96a', color: '#ffffff',
                  border: 'none', borderRadius: '24px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 2px 10px rgba(200,169,106,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Bot size={15} /> AI に相談
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
          {phaseStats.map(({ phase, total: t, completed: c }) => {
            const r = t > 0 ? Math.round((c / t) * 100) : 0
            const colors = ['', '#c8a96a', '#4a9e5c', '#5a8faa', '#aa5a8f']
            return (
              <div key={phase}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#4b5563' }}>フェーズ{phase}</span>
                  <span style={{ fontSize: '11px', color: colors[phase] }}>{r}%</span>
                </div>
                <div style={{ height: '4px', background: '#d1d5db', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${r}%`, background: colors[phase], borderRadius: '2px' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{c}/{t}項目</div>
              </div>
            )
          })}
        </div>

        {/* ストリーク & バッジ */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #d1d5db', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          {/* ストリーク */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#eef0f3', borderRadius: '8px', padding: '10px 16px', minWidth: '180px' }}>
            <Flame size={20} color={streak.streak > 0 ? '#e05454' : '#6b7280'} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: streak.streak > 0 ? '#e05454' : '#6b7280', lineHeight: 1 }}>
                {streak.streak}日連続
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                今週 {streak.weekDays}日学習
              </div>
            </div>
          </div>

          {/* バッジ一覧 */}
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {badges.map(b => (
              <div
                key={b.id}
                title={b.description}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: b.earned ? `${b.color}18` : '#eef0f3',
                  color: b.earned ? b.color : '#d1d5db',
                  border: `1px solid ${b.earned ? `${b.color}40` : '#d1d5db'}`,
                  opacity: b.earned ? 1 : 0.6,
                  transition: 'all 0.2s',
                  filter: b.earned ? 'none' : 'grayscale(1)',
                }}
              >
                <span style={{ fontSize: '14px' }}>{b.emoji}</span>
                <span>{b.label}</span>
                {b.earned && <Trophy size={11} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '2px' }}>
        {([1, 2, 3, 4] as const).map(ph => {
          const isActive = activePhase === ph
          const phStat = phaseStats.find(s => s.phase === ph)
          return (
            <button key={ph} onClick={() => setActivePhase(ph)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 18px', fontSize: '13px', fontWeight: isActive ? 700 : 400,
              whiteSpace: 'nowrap', cursor: 'pointer',
              background: isActive ? '#c8a96a' : '#ffffff',
              color: isActive ? '#ffffff' : '#4b5563',
              border: isActive ? '1px solid #c8a96a' : '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: isActive ? '0 2px 8px rgba(200,169,106,0.3)' : 'none',
              transition: 'all 0.15s',
              minWidth: '80px',
            }}>
              <span>フェーズ{ph}</span>
              <span style={{ fontSize: '10px', marginTop: '2px', opacity: 0.75 }}>{PHASE_NAMES[ph]}</span>
              {phStat && (
                <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.85 }}>{phStat.completed}/{phStat.total}</span>
              )}
            </button>
          )
        })}
        <button onClick={() => setActivePhase('calendar')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '10px 18px', fontSize: '13px', fontWeight: activePhase === 'calendar' ? 700 : 400,
          whiteSpace: 'nowrap', cursor: 'pointer',
          background: activePhase === 'calendar' ? '#c8a96a' : '#ffffff',
          color: activePhase === 'calendar' ? '#ffffff' : '#4b5563',
          border: activePhase === 'calendar' ? '1px solid #c8a96a' : '1px solid #d1d5db',
          borderRadius: '8px',
          boxShadow: activePhase === 'calendar' ? '0 2px 8px rgba(200,169,106,0.3)' : 'none',
          transition: 'all 0.15s', gap: '4px', minWidth: '80px',
        }}>
          <Calendar size={15} />
          <span style={{ fontSize: '11px', marginTop: '2px' }}>カレンダー</span>
        </button>
        <button onClick={() => setActivePhase('reports')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '10px 18px', fontSize: '13px', fontWeight: activePhase === 'reports' ? 700 : 400,
          whiteSpace: 'nowrap', cursor: 'pointer',
          background: activePhase === 'reports' ? '#c8a96a' : '#ffffff',
          color: activePhase === 'reports' ? '#ffffff' : '#4b5563',
          border: activePhase === 'reports' ? '1px solid #c8a96a' : '1px solid #d1d5db',
          borderRadius: '8px',
          boxShadow: activePhase === 'reports' ? '0 2px 8px rgba(200,169,106,0.3)' : 'none',
          transition: 'all 0.15s', gap: '4px', minWidth: '80px', position: 'relative',
        }}>
          <FileText size={15} />
          <span style={{ fontSize: '11px', marginTop: '2px' }}>日報</span>
          {reports.length > 0 && (
            <span style={{
              position: 'absolute', top: '6px', right: '6px',
              fontSize: '10px', background: activePhase === 'reports' ? 'rgba(255,255,255,0.4)' : '#c8a96a',
              color: '#fff', borderRadius: '8px', padding: '0 5px', lineHeight: '16px',
            }}>{reports.length}</span>
          )}
        </button>
        {isAdmin && (
          <button onClick={() => setActivePhase('ai')} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '10px 18px', fontSize: '13px', fontWeight: activePhase === 'ai' ? 700 : 400,
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: activePhase === 'ai' ? '#c8a96a' : '#ffffff',
            color: activePhase === 'ai' ? '#ffffff' : '#4b5563',
            border: activePhase === 'ai' ? '1px solid #c8a96a' : '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: activePhase === 'ai' ? '0 2px 8px rgba(200,169,106,0.3)' : 'none',
            transition: 'all 0.15s', gap: '4px', minWidth: '80px',
          }}>
            <Bot size={15} />
            <span style={{ fontSize: '11px', marginTop: '2px' }}>AIサマリー</span>
          </button>
        )}
      </div>

      {/* AIサマリービュー */}
      {activePhase === 'ai' && (
        <AiSummary emp={emp} items={items} progress={progress} reports={reports} />
      )}

      {/* カレンダービュー */}
      {activePhase === 'calendar' && (
        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '24px' }}>
          <CalendarView items={items} progress={progress} />
        </div>
      )}

      {/* 日報ビュー */}
      {activePhase === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: '16px' }}>
          {/* 左: 日報一覧 */}
          <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1d5db', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>過去の日報</div>
            {reports.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>まだ日報がありません</div>
            ) : (
              reports.map(r => (
                <button key={r.id} onClick={() => selectReport(r)} style={{
                  width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: r.report_date === selectedDate ? 'rgba(200,169,106,0.08)' : 'transparent',
                  border: 'none', borderBottom: '1px solid #d1d5db',
                  borderLeft: r.report_date === selectedDate ? '2px solid #c8a96a' : '2px solid transparent',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: r.report_date === selectedDate ? 600 : 400 }}>
                    {format(parseISO(r.report_date), 'M月d日(EEE)', { locale: ja })}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.goal_and_achievement.slice(0, 20) || '—'}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 右: 日報入力/表示 */}
          <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={e => onDateChange(e.target.value)}
                disabled={!isAdmin && me?.id !== targetId}
                style={{ fontSize: '13px', fontWeight: 600, color: '#111827', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 10px', background: '#eef0f3' }}
              />
              {(isAdmin || me?.id === targetId) && (
                <button onClick={saveReport} disabled={reportSaving} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', background: reportSaving ? '#d1d5db' : '#c8a96a',
                  color: reportSaving ? '#6b7280' : '#ffffff', border: 'none', borderRadius: '4px',
                  fontSize: '12px', fontWeight: 600, cursor: reportSaving ? 'not-allowed' : 'pointer',
                }}>
                  <Save size={13} />{reportSaving ? '保存中...' : '保存'}
                </button>
              )}
            </div>

            {[
              { key: 'goal_and_achievement', label: '今日の目標とそれに対しての取り組みと達成度合' },
              { key: 'learned_today', label: '今日学んだこと' },
              { key: 'tomorrow_goal', label: '明日の目標とそれに対してどう行動していくか' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600, marginBottom: '8px' }}>【{label}】</div>
                <textarea
                  value={reportForm[key as keyof typeof reportForm]}
                  onChange={e => setReportForm(f => ({ ...f, [key]: e.target.value }))}
                  readOnly={!isAdmin && me?.id !== targetId}
                  rows={4}
                  placeholder={isAdmin || me?.id === targetId ? '入力してください' : '—'}
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px',
                    color: '#111827', fontSize: '13px', resize: 'vertical',
                    fontFamily: 'inherit', lineHeight: 1.6,
                    cursor: (!isAdmin && me?.id !== targetId) ? 'default' : 'text',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* チェックリスト */}
      {typeof activePhase === 'number' && (
        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
          {phaseItems.map((item, idx) => {
            const rec = progress.find(p => p.item_id === item.id)
            const isCompleted = rec?.is_completed ?? false
            const isTestPassed = rec?.is_test_passed ?? false
            const delayDays = rec && !isCompleted && rec.planned_date
              ? differenceInDays(today, parseISO(rec.planned_date))
              : 0
            const isDelayed = delayDays > 0
            const showComment = rec ? openComments.has(rec.id) : false

            return (
              <div key={item.id} style={{
                borderBottom: idx < phaseItems.length - 1 ? '1px solid #d1d5db' : 'none',
                padding: '16px 20px',
                background: isCompleted ? 'rgba(74,158,92,0.02)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input type="checkbox" checked={isCompleted} onChange={() => toggleComplete(item.id)}
                    style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#c8a96a' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                      {item.is_required_test && <Star size={13} color="#c8a96a" fill="#c8a96a" />}
                      <span style={{ fontSize: '13px', color: isCompleted ? '#6b7280' : '#111827', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {item.content}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#4b5563', padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: '2px' }}>
                        {TRAINER_TYPE_ICON[item.trainer_type]}{TRAINER_TYPE_LABEL[item.trainer_type]}
                      </span>
                      {item.video_url && (
                        <a href={item.video_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#5a8faa', textDecoration: 'none' }}>
                          <Video size={11} />動画<ExternalLink size={9} />
                        </a>
                      )}
                      {isDelayed && <span style={{ fontSize: '11px', color: '#e05454', fontWeight: 600 }}>△{delayDays}日 遅れ</span>}
                      {isCompleted && rec?.completed_at && (
                        <span style={{ fontSize: '11px', color: '#4a9e5c' }}>✓ {format(parseISO(rec.completed_at), 'M/d')} 完了</span>
                      )}
                      {/* 社内検定 合格承認ボタン（管理者のみ） */}
                      {item.is_required_test && isAdmin && (
                        <button
                          onClick={() => toggleTestPassed(item.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                            border: 'none', borderRadius: '3px', cursor: 'pointer',
                            background: isTestPassed ? 'rgba(74,158,92,0.12)' : 'rgba(200,169,106,0.12)',
                            color: isTestPassed ? '#4a9e5c' : '#c8a96a',
                          }}
                        >
                          <CheckCircle size={12} />
                          {isTestPassed ? '合格済み' : '合格承認'}
                        </button>
                      )}
                      {/* traineeには合格状態を表示のみ */}
                      {item.is_required_test && !isAdmin && isTestPassed && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4a9e5c', fontWeight: 600 }}>
                          <CheckCircle size={12} /> 合格済み
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px' : '12px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
                        予定日:
                        <input type="date" disabled={!isAdmin} value={rec?.planned_date ?? ''}
                          onChange={e => updateField(item.id, 'planned_date', e.target.value)}
                          style={{ background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '2px', color: isDelayed ? '#e05454' : '#4b5563', fontSize: '11px', padding: '2px 6px', cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
                        担当者:
                        {isAdmin ? (
                          <select
                            value={rec?.trainer_name ?? ''}
                            onChange={e => updateField(item.id, 'trainer_name', e.target.value)}
                            style={{ background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '2px', color: '#4b5563', fontSize: '11px', padding: '2px 6px', minWidth: '100px' }}
                          >
                            <option value="">未設定</option>
                            {admins.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#4b5563' }}>{rec?.trainer_name ?? '—'}</span>
                        )}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
                        メモ:
                        <input type="text" disabled={!isAdmin} value={rec?.memo ?? ''} onChange={e => updateField(item.id, 'memo', e.target.value)} placeholder="メモ"
                          style={{ background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '2px', color: '#4b5563', fontSize: '11px', padding: '2px 6px', width: '160px', cursor: isAdmin ? 'text' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }} />
                      </label>
                      {rec && (
                        <button onClick={() => toggleComment(rec.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '11px', color: showComment ? '#c8a96a' : '#6b7280', padding: 0,
                        }}>
                          <MessageSquare size={12} />コメント
                        </button>
                      )}
                    </div>

                    {rec && showComment && (
                      <CommentPanel record={rec} authorId={me!.id} isAdmin={isAdmin} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AIチャットパネル（管理者のみ） */}
      {isAdmin && (
        <AiChat emp={emp} items={items} progress={progress} reports={reports} open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      )}
    </div>
  )
}
