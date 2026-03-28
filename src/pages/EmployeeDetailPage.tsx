import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Employee, CurriculumItem, ProgressRecord, ProgressComment } from '../types/database'
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Star, Video, User, BookOpen, Wrench, ExternalLink, MessageSquare, ChevronLeft, ChevronRight as ChevronRightIcon, Calendar } from 'lucide-react'
import { Breadcrumb } from '../components/Layout'

const TRAINER_TYPE_ICON = {
  self: <BookOpen size={13} color="#6b7280" />,
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
    <div style={{ marginTop: '12px', borderTop: '1px solid #f0f2f5', paddingTop: '10px' }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ fontSize: '11px', background: '#f7f8fa', borderRadius: '4px', padding: '6px 10px' }}>
              <span style={{ color: '#c8a96a', fontWeight: 600 }}>{authors[c.author_id] ?? '—'}</span>
              <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{format(parseISO(c.created_at), 'M/d HH:mm')}</span>
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
              background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px',
              color: '#111827', outline: 'none',
            }}
          />
          <button
            onClick={addComment}
            disabled={saving || !text.trim()}
            style={{
              padding: '5px 12px', fontSize: '11px', background: '#c8a96a', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
            }}
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
  const startDow = getDay(monthStart) // 0=Sun

  // planned_date ごとにアイテムをマッピング
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
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', minWidth: '120px', textAlign: 'center' }}>
          {format(current, 'yyyy年M月', { locale: ja })}
        </span>
        <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}>
          <ChevronRightIcon size={14} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: i === 0 ? '#e05454' : i === 6 ? '#5a8faa' : '#9ca3af', padding: '4px' }}>{d}</div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {/* 月初の空白 */}
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
              border: `1px solid ${isToday ? '#c8a96a' : '#f0f2f5'}`,
              borderRadius: '4px',
            }}>
              <div style={{ fontSize: '11px', color: isToday ? '#c8a96a' : '#6b7280', fontWeight: isToday ? 700 : 400, marginBottom: '2px' }}>
                {day.getDate()}
              </div>
              {entries.slice(0, 2).map(({ item, rec }) => (
                <div key={item.id} style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  marginBottom: '1px',
                  background: rec.is_completed ? 'rgba(74,158,92,0.12)' : 'rgba(200,169,106,0.12)',
                  color: rec.is_completed ? '#4a9e5c' : '#b8941a',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {item.content.slice(0, 12)}…
                </div>
              ))}
              {entries.length > 2 && (
                <div style={{ fontSize: '9px', color: '#9ca3af' }}>+{entries.length - 2}</div>
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
  const [activePhase, setActivePhase] = useState<number | 'calendar'>(1)
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const targetId = id ?? me?.id

  useEffect(() => {
    if (!targetId) return
    async function load() {
      const [{ data: empData }, { data: currItems }, { data: prog }] = await Promise.all([
        supabase.from('employees').select('*').eq('id', targetId!).single(),
        supabase.from('curriculum_items').select('*').order('phase').order('sort_order'),
        supabase.from('progress_records').select('*').eq('employee_id', targetId!),
      ])
      setEmp(empData)
      setItems(currItems ?? [])
      setProgress(prog ?? [])
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

  function toggleComment(recId: string) {
    setOpenComments(prev => {
      const next = new Set(prev)
      next.has(recId) ? next.delete(recId) : next.add(recId)
      return next
    })
  }

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>読み込み中...</div>
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

  return (
    <div style={{ padding: '40px' }}>
      <Breadcrumb items={[{ label: 'ダッシュボード', to: '/' }, { label: emp.name }]} />

      {/* ヘッダー */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '28px 32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>{emp.name}</h1>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              入社日: {format(parseISO(emp.joined_at), 'yyyy年M月d日')}
            </div>
            {mentor && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                担当メンター: <span style={{ color: '#c8a96a' }}>{mentor.name}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '48px', fontWeight: 700, color: '#c8a96a', lineHeight: 1 }}>{rate}%</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{completed}/{total} 項目完了</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
          {phaseStats.map(({ phase, total: t, completed: c }) => {
            const r = t > 0 ? Math.round((c / t) * 100) : 0
            const colors = ['', '#c8a96a', '#4a9e5c', '#5a8faa', '#aa5a8f']
            return (
              <div key={phase}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>フェーズ{phase}</span>
                  <span style={{ fontSize: '11px', color: colors[phase] }}>{r}%</span>
                </div>
                <div style={{ height: '4px', background: '#f0f2f5', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${r}%`, background: colors[phase], borderRadius: '2px' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{c}/{t}項目</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* タブ（フェーズ1〜4 + カレンダー） */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
        {([1, 2, 3, 4] as const).map(ph => (
          <button key={ph} onClick={() => setActivePhase(ph)} style={{
            padding: '8px 20px', fontSize: '12px',
            color: activePhase === ph ? '#c8a96a' : '#6b7280',
            background: 'none', border: 'none',
            borderBottom: activePhase === ph ? '2px solid #c8a96a' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-1px',
          }}>
            フェーズ{ph}
            <span style={{ fontSize: '10px', marginLeft: '4px', color: '#9ca3af' }}>
              {PHASE_NAMES[ph]}
            </span>
          </button>
        ))}
        <button onClick={() => setActivePhase('calendar')} style={{
          padding: '8px 20px', fontSize: '12px',
          color: activePhase === 'calendar' ? '#c8a96a' : '#6b7280',
          background: 'none', border: 'none',
          borderBottom: activePhase === 'calendar' ? '2px solid #c8a96a' : '2px solid transparent',
          cursor: 'pointer', marginBottom: '-1px',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <Calendar size={13} /> カレンダー
        </button>
      </div>

      {/* カレンダービュー */}
      {activePhase === 'calendar' && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '24px' }}>
          <CalendarView items={items} progress={progress} />
        </div>
      )}

      {/* チェックリスト */}
      {typeof activePhase === 'number' && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          {phaseItems.map((item, idx) => {
            const rec = progress.find(p => p.item_id === item.id)
            const isCompleted = rec?.is_completed ?? false
            const delayDays = rec && !isCompleted && rec.planned_date
              ? differenceInDays(today, parseISO(rec.planned_date))
              : 0
            const isDelayed = delayDays > 0
            const showComment = rec ? openComments.has(rec.id) : false

            return (
              <div key={item.id} style={{
                borderBottom: idx < phaseItems.length - 1 ? '1px solid #f0f2f5' : 'none',
                padding: '16px 20px',
                background: isCompleted ? 'rgba(74,158,92,0.02)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input type="checkbox" checked={isCompleted} onChange={() => toggleComplete(item.id)}
                    style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#c8a96a' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                      {item.is_required_test && <Star size={13} color="#c8a96a" fill="#c8a96a" />}
                      <span style={{ fontSize: '13px', color: isCompleted ? '#9ca3af' : '#111827', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {item.content}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6b7280', padding: '2px 8px', border: '1px solid #e5e7eb', borderRadius: '2px' }}>
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
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
                        予定日:
                        <input type="date" disabled={!isAdmin} value={rec?.planned_date ?? ''}
                          onChange={e => updateField(item.id, 'planned_date', e.target.value)}
                          style={{ background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '2px', color: isDelayed ? '#e05454' : '#6b7280', fontSize: '11px', padding: '2px 6px', cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
                        担当者:
                        <input type="text" disabled={!isAdmin} value={rec?.trainer_name ?? ''} onChange={e => updateField(item.id, 'trainer_name', e.target.value)} placeholder="名前を入力"
                          style={{ background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '2px', color: '#6b7280', fontSize: '11px', padding: '2px 6px', width: '100px', cursor: isAdmin ? 'text' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
                        メモ:
                        <input type="text" disabled={!isAdmin} value={rec?.memo ?? ''} onChange={e => updateField(item.id, 'memo', e.target.value)} placeholder="メモ"
                          style={{ background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '2px', color: '#6b7280', fontSize: '11px', padding: '2px 6px', width: '180px', cursor: isAdmin ? 'text' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }} />
                      </label>
                      {rec && (
                        <button onClick={() => toggleComment(rec.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '11px', color: showComment ? '#c8a96a' : '#9ca3af', padding: 0,
                        }}>
                          <MessageSquare size={12} />
                          コメント
                        </button>
                      )}
                    </div>

                    {/* コメントパネル */}
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
    </div>
  )
}
