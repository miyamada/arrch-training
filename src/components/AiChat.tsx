import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader } from 'lucide-react'
import type { Employee, CurriculumItem, ProgressRecord, DailyReport } from '../types/database'
import { parseISO, differenceInDays } from 'date-fns'

interface Message {
  role: 'user' | 'model'
  text: string
}

interface Props {
  emp: Employee
  items: CurriculumItem[]
  progress: ProgressRecord[]
  reports: DailyReport[]
  open?: boolean
  onClose?: () => void
}

function buildSystemContext(emp: Employee, items: CurriculumItem[], progress: ProgressRecord[], reports: DailyReport[]): string {
  const today = new Date()
  const joinedDays = differenceInDays(today, parseISO(emp.joined_at))
  const completed = progress.filter(p => p.is_completed).length
  const total = items.length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  const delayed = progress.filter(p => !p.is_completed && p.planned_date && differenceInDays(today, parseISO(p.planned_date)) > 0)
  const delayedItems = delayed.map(p => {
    const item = items.find(i => i.id === p.item_id)
    const days = differenceInDays(today, parseISO(p.planned_date!))
    return `「${item?.content ?? '不明'}」（${days}日遅れ）`
  })

  const phaseStats = [1, 2, 3, 4].map(ph => {
    const phItems = items.filter(i => i.phase === ph)
    const done = phItems.filter(i => progress.find(p => p.item_id === i.id && p.is_completed)).length
    return `フェーズ${ph}: ${done}/${phItems.length}完了`
  }).join('、')

  const recentReports = reports.slice(0, 10).map(r =>
    `【${r.report_date}】\n目標と達成度: ${r.goal_and_achievement || '未記入'}\n学んだこと: ${r.learned_today || '未記入'}\n明日の目標: ${r.tomorrow_goal || '未記入'}`
  ).join('\n\n')

  return `あなたはARRCH（住宅営業会社）の新入社員育成を支援するAIアドバイザーです。
管理者が社員の状況について相談できるよう、以下のデータをもとに、親身かつ具体的なアドバイスをしてください。

=== 社員情報 ===
名前: ${emp.name}
入社日: ${emp.joined_at}（入社${joinedDays}日目）

=== カリキュラム進捗 ===
全体: ${completed}/${total}項目完了（${rate}%）
${phaseStats}
${delayedItems.length > 0 ? `\n遅延中の項目:\n${delayedItems.join('\n')}` : '\n遅延なし'}

=== 直近の日報（新しい順）===
${recentReports || '日報なし'}

管理者の質問に日本語で回答してください。進捗データや日報の内容から、精神状態・モチベーション・つまずきポイントなどの傾向を読み取り、具体的なアドバイスをしてください。`
}

export default function AiChat({ emp, items, progress, reports, open: openProp, onClose }: Props) {
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : openInternal

  function handleOpen() { if (!isControlled) setOpenInternal(true) }
  function handleClose() { if (isControlled) { onClose?.() } else { setOpenInternal(false) } }

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setMessages([{
      role: 'model',
      text: `${emp.name}さんについてご相談ください。進捗状況や日報の内容をもとにアドバイスします。`,
    }])
  }, [open, emp.name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    const nextMessages: Message[] = [...messages, { role: 'user', text: userText }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          systemContext: buildSystemContext(emp, items, progress, reports),
          messages: nextMessages,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { text } = await res.json()
      setMessages(prev => [...prev, { role: 'model', text }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isQuota = msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
      setMessages(prev => [...prev, {
        role: 'model',
        text: isQuota
          ? 'リクエストが集中しています。数秒待ってから再度お試しください。'
          : 'エラーが発生しました。もう一度お試しください。',
      }])
    }
    setLoading(false)
  }

  return (
    <>
      {!isControlled && (
        <button onClick={handleOpen} style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 20px', background: '#c8a96a', color: '#ffffff',
          border: 'none', borderRadius: '28px', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(200,169,106,0.4)',
        }}>
          <Bot size={16} /> AI に相談
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed',
          bottom: '16px', right: '16px',
          left: window.innerWidth < 768 ? '16px' : 'auto',
          zIndex: 100,
          width: window.innerWidth < 768 ? 'auto' : '380px',
          height: '520px',
          background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #d1d5db',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#eef0f3',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={16} color="#c8a96a" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>AI相談 — {emp.name}</span>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? '#c8a96a' : '#eef0f3',
                  color: msg.role === 'user' ? '#ffffff' : '#111827',
                  fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  border: msg.role === 'model' ? '1px solid #d1d5db' : 'none',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> 考え中...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #d1d5db', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="質問を入力（Enter送信）"
              style={{
                flex: 1, padding: '8px 12px', fontSize: '12px',
                background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '6px',
                color: '#111827', outline: 'none',
              }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
              padding: '8px 12px',
              background: loading || !input.trim() ? '#d1d5db' : '#c8a96a',
              color: loading || !input.trim() ? '#6b7280' : '#ffffff',
              border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
