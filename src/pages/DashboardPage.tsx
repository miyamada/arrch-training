import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Employee, CurriculumItem, ProgressRecord } from '../types/database'
import { differenceInDays, parseISO } from 'date-fns'
import { AlertTriangle, Users, TrendingUp, Clock, BookOpen, ChevronRight } from 'lucide-react'
import { Breadcrumb } from '../components/Layout'
import { calcBadges } from '../utils/gamification'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface EmployeeRow extends Employee {
  mentor: Employee | null
  progress: ProgressRecord[]
  items: CurriculumItem[]
}

function calcStats(emp: EmployeeRow, today: Date) {
  const total = emp.items.length
  const completed = emp.progress.filter(p => p.is_completed).length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  const delayed = emp.progress.filter(p => {
    if (p.is_completed || !p.planned_date) return false
    return parseISO(p.planned_date) < today
  })
  const maxDelay = delayed.length > 0
    ? Math.max(...delayed.map(p => differenceInDays(today, parseISO(p.planned_date!))))
    : 0

  const completedItems = emp.progress
    .filter(p => p.is_completed)
    .map(p => emp.items.find(i => i.id === p.item_id))
    .filter(Boolean) as CurriculumItem[]
  const maxCompletedPhase = completedItems.length > 0
    ? Math.max(...completedItems.map(i => i.phase))
    : 0
  const currentPhase = Math.min(maxCompletedPhase + 1, 4)

  const joinedDate = parseISO(emp.joined_at)
  const monthsElapsed = Math.floor(differenceInDays(today, joinedDate) / 30) + 1

  return { total, completed, rate, maxDelay, isDelayed: delayed.length > 0, currentPhase, monthsElapsed }
}

const PHASE_COLORS = ['', '#c8a96a', '#4a9e5c', '#5a8faa', '#aa5a8f']
const PHASE_NAMES = ['', 'フェーズ1', 'フェーズ2', 'フェーズ3', 'フェーズ4']

export default function DashboardPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'delayed' | 1 | 2 | 3 | 4>('all')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const today = new Date()

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: emps }, { data: currItems }, { data: progress }] = await Promise.all([
        supabase.from('employees').select('*').eq('role', 'trainee'),
        supabase.from('curriculum_items').select('*').order('phase').order('sort_order'),
        supabase.from('progress_records').select('*'),
      ])

      if (!emps || !currItems || !progress) { setLoading(false); return }

      const mentorIds = [...new Set(emps.map(e => e.mentor_id).filter(Boolean))] as string[]
      const { data: mentors } = mentorIds.length > 0
        ? await supabase.from('employees').select('*').in('id', mentorIds)
        : { data: [] }

      const rows: EmployeeRow[] = emps.map(emp => ({
        ...emp,
        mentor: mentors?.find(m => m.id === emp.mentor_id) ?? null,
        progress: progress.filter(p => p.employee_id === emp.id),
        items: currItems,
      }))

      setItems(currItems)
      setEmployees(rows)
      setLoading(false)
    }
    load()
  }, [])

  const statsRows = employees.map(emp => ({ emp, stats: calcStats(emp, today) }))
  const delayedEmployees = statsRows.filter(r => r.stats.isDelayed)
  const avgRate = statsRows.length > 0
    ? Math.round(statsRows.reduce((s, r) => s + r.stats.rate, 0) / statsRows.length)
    : 0
  const thisMonthTests = items.filter(i => i.is_required_test).length

  const filtered = statsRows.filter(({ stats }) => {
    if (filter === 'delayed') return stats.isDelayed
    if (typeof filter === 'number') return stats.currentPhase === filter
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#4b5563' }}>読み込み中...</div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '40px' }}>
      <Breadcrumb items={[{ label: 'ダッシュボード' }]} />

      {/* KPI カード */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '在籍研修者数', value: `${employees.length}名`, icon: Users, color: '#c8a96a' },
          { label: '平均進捗率', value: `${avgRate}%`, icon: TrendingUp, color: '#4a9e5c' },
          { label: '遅延発生者数', value: `${delayedEmployees.length}名`, icon: Clock, color: delayedEmployees.length > 0 ? '#e05454' : '#4a9e5c' },
          { label: '社内検定項目数', value: `${thisMonthTests}件`, icon: BookOpen, color: '#c8a96a' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500, marginBottom: '10px' }}>{label}</div>
                <div style={{ fontSize: '30px', fontWeight: 700, color: '#111827' }}>{value}</div>
              </div>
              <Icon size={18} color={color} />
            </div>
          </div>
        ))}
      </div>

      {/* アラートバナー */}
      {delayedEmployees.length > 0 && (
        <div style={{
          background: 'rgba(224,84,84,0.05)',
          border: '1px solid rgba(224,84,84,0.2)',
          borderRadius: '4px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertTriangle size={16} color="#e05454" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#e05454', fontWeight: 600, marginBottom: '6px' }}>
              {delayedEmployees.length}名の研修者に遅延が発生しています
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.6' }}>
              {delayedEmployees.map(({ emp, stats }) => (
                <span key={emp.id} style={{ marginRight: '16px' }}>
                  {emp.name}（最大 <span style={{ color: '#e05454' }}>{stats.maxDelay}日</span> 遅れ）
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 進捗グラフ */}
      {statsRows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* 社員別進捗率 */}
          <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500, marginBottom: '16px' }}>社員別進捗率</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statsRows.map(({ emp, stats }) => ({ name: emp.name, rate: stats.rate }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <Tooltip formatter={(v) => [`${v}%`, '進捗率']} contentStyle={{ fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }} />
                <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
                  {statsRows.map(({ stats }, i) => (
                    <Cell key={i} fill={stats.isDelayed ? '#e05454' : stats.rate >= 80 ? '#4a9e5c' : '#c8a96a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* フェーズ別人数分布 */}
          <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500, marginBottom: '16px' }}>フェーズ別在籍人数</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[1,2,3,4].map(ph => ({
                  name: `フェーズ${ph}`,
                  count: statsRows.filter(r => r.stats.currentPhase === ph).length,
                }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <Tooltip formatter={(v) => [`${v}名`, '人数']} contentStyle={{ fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {[1,2,3,4].map((_, i) => (
                    <Cell key={i} fill={['#c8a96a','#4a9e5c','#5a8faa','#aa5a8f'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* フィルタータブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #d1d5db', paddingBottom: '0', overflowX: 'auto' }}>
        {(['all', 'delayed', 1, 2, 3, 4] as const).map(f => {
          const label = f === 'all' ? 'すべて' : f === 'delayed' ? '遅延のみ' : `フェーズ${f}`
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                color: isActive ? '#c8a96a' : '#4b5563',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #c8a96a' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* 社員進捗テーブル */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: isMobile ? '600px' : 'unset' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #d1d5db', background: '#eef0f3' }}>
              {['社員名', '入社経過', '現在フェーズ', '進捗', 'スケジュール', '担当メンター', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#4b5563',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  該当する研修者がいません
                </td>
              </tr>
            )}
            {filtered.map(({ emp, stats }) => (
              <tr
                key={emp.id}
                style={{ borderBottom: '1px solid #d1d5db', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#eef0f3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: '#111827', fontWeight: 500 }}>{emp.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {new Date(emp.joined_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })} 入社
                  </div>
                  {(() => {
                    const earnedBadges = calcBadges(emp.items, emp.progress).filter(b => b.earned)
                    if (earnedBadges.length === 0) return null
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {earnedBadges.map(b => (
                          <span
                            key={b.id}
                            title={b.description}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              borderRadius: '2px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: `${b.color}18`,
                              color: b.color,
                              border: `1px solid ${b.color}40`,
                              whiteSpace: 'nowrap',
                              cursor: 'default',
                            }}
                          >
                            {b.emoji} {b.label}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </td>
                <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                  {stats.monthsElapsed}ヶ月目
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: `${PHASE_COLORS[stats.currentPhase]}15`,
                    color: PHASE_COLORS[stats.currentPhase],
                    border: `1px solid ${PHASE_COLORS[stats.currentPhase]}40`,
                  }}>
                    {PHASE_NAMES[stats.currentPhase]}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        height: '4px',
                        background: '#d1d5db',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginBottom: '4px',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${stats.rate}%`,
                          background: stats.rate >= 80 ? '#4a9e5c' : '#c8a96a',
                          borderRadius: '2px',
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#4b5563' }}>
                        {stats.completed}/{stats.total}項目
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', minWidth: '36px', textAlign: 'right' }}>
                      {stats.rate}%
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {stats.isDelayed ? (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(224,84,84,0.07)',
                      color: '#e05454',
                      border: '1px solid rgba(224,84,84,0.2)',
                    }}>
                      △{stats.maxDelay}日 遅れ
                    </span>
                  ) : (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(74,158,92,0.07)',
                      color: '#4a9e5c',
                      border: '1px solid rgba(74,158,92,0.2)',
                    }}>
                      順調
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '12px' }}>
                  {emp.mentor?.name ?? '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Link
                    to={`/employees/${emp.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#c8a96a',
                      textDecoration: 'none',
                      fontSize: '12px',
                    }}
                  >
                    詳細 <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
