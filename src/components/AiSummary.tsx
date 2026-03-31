import { useEffect, useState } from 'react'
import { Loader, RefreshCw, FileBarChart2, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Employee, CurriculumItem, ProgressRecord, DailyReport } from '../types/database'

interface KeywordItem { word: string; count: number; context: string }
interface KeywordAnalysis {
  keywords: KeywordItem[]
  quality_score: number
  quality_comment: string
  themes: string[]
  recommendation: string
}
interface WeeklyReportData {
  week_range: string
  completed_count: number
  completed_items: string[]
  report_quality: string
  key_learnings: string
  concerns: string
  next_focus: string
}

interface Props {
  emp: Employee
  items: CurriculumItem[]
  progress: ProgressRecord[]
  reports: DailyReport[]
}

async function callAI(prompt: string): Promise<string> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'analyze', prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  const { text } = await res.json()
  return text.trim().replace(/^```json\s*/,'').replace(/\s*```$/,'')
}

export default function AiSummary({ emp, items, progress, reports }: Props) {
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null)
  const [weekly, setWeekly] = useState<WeeklyReportData | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)
  const [weeklyOpen, setWeeklyOpen] = useState(false)

  useEffect(() => {
    if (reports.length > 0) runAnalysis()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.length])

  async function runAnalysis() {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const recentText = reports.slice(0, 20).map(r =>
        `[${r.report_date}] 目標と達成度:${r.goal_and_achievement || '未記入'} / 学び:${r.learned_today || '未記入'} / 明日:${r.tomorrow_goal || '未記入'}`
      ).join('\n')

      const prompt = `新入社員「${emp.name}」の日報（直近${Math.min(reports.length, 20)}件）を分析してください。

${recentText}

以下のJSONのみを返してください（説明文・\`\`\`不要）:
{"keywords":[{"word":"単語","count":出現回数,"context":"使われ方の説明"}],"quality_score":1〜10の整数,"quality_comment":"スコアの理由を1〜2文","themes":["テーマ1","テーマ2","テーマ3"],"recommendation":"管理者へのアドバイスを2〜3文"}
keywordsは重要な単語を出現の多い順に最大8件。`

      const text = await callAI(prompt)
      setAnalysis(JSON.parse(text))
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : String(e))
    }
    setAnalysisLoading(false)
  }

  async function generateWeekly() {
    setWeeklyLoading(true)
    setWeeklyError(null)
    try {
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const weekRange = `${format(weekStart, 'M/d', { locale: ja })}〜${format(weekEnd, 'M/d', { locale: ja })}`

      const thisWeekReports = reports.filter(r =>
        isWithinInterval(parseISO(r.report_date), { start: weekStart, end: weekEnd })
      )
      const completedThisWeek = progress.filter(p =>
        p.is_completed && p.completed_at &&
        isWithinInterval(parseISO(p.completed_at), { start: weekStart, end: weekEnd })
      )
      const completedNames = completedThisWeek.map(p => items.find(i => i.id === p.item_id)?.content ?? '不明')

      const reportsText = thisWeekReports.length > 0
        ? thisWeekReports.map(r =>
            `[${r.report_date}] 目標と達成度:${r.goal_and_achievement} / 学び:${r.learned_today} / 明日:${r.tomorrow_goal}`
          ).join('\n')
        : '今週の日報なし'

      const prompt = `新入社員「${emp.name}」の週次レポートを生成してください。
対象週: ${weekRange}
今週完了した項目(${completedNames.length}件): ${completedNames.join('、') || 'なし'}
今週の日報:
${reportsText}

以下のJSONのみを返してください（説明文・\`\`\`不要）:
{"week_range":"${weekRange}","completed_count":${completedNames.length},"completed_items":${JSON.stringify(completedNames)},"report_quality":"今週の日報の質を1〜2文で評価","key_learnings":"今週の重要な学びを2〜3文","concerns":"気になる点を1〜2文（なければ特になし）","next_focus":"来週のフォーカスポイントを1〜2文"}`

      const text = await callAI(prompt)
      setWeekly(JSON.parse(text))
      setWeeklyOpen(true)
    } catch (e) {
      setWeeklyError(e instanceof Error ? e.message : String(e))
    }
    setWeeklyLoading(false)
  }

  const scoreColor = (s: number) =>
    s >= 8 ? '#4a9e5c' : s >= 5 ? '#c8a96a' : '#e05454'

  const maxCount = analysis?.keywords[0]?.count ?? 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── キーワード分析カード ── */}
      <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #d1d5db',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#eef0f3',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
            <FileBarChart2 size={15} color="#c8a96a" />
            日報キーワード分析
            {reports.length > 0 && <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>（直近{Math.min(reports.length, 20)}件）</span>}
          </div>
          <button
            onClick={runAnalysis}
            disabled={analysisLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}
          >
            <RefreshCw size={11} style={{ animation: analysisLoading ? 'spin 1s linear infinite' : 'none' }} />
            再分析
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', padding: '24px 0' }}>
              日報がまだありません
            </div>
          ) : analysisLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#6b7280', fontSize: '13px', padding: '24px 0' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> AI分析中...
            </div>
          ) : analysisError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e05454', fontSize: '12px' }}>
              <AlertCircle size={14} /> 分析に失敗しました。再分析ボタンをお試しください。
            </div>
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* キーワードランキング */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>キーワードランキング</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analysis.keywords.map((kw, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '18px', fontSize: '11px', fontWeight: 700, color: i === 0 ? '#c8a96a' : i === 1 ? '#9ca3af' : '#b45309', textAlign: 'right', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ width: '80px', fontSize: '12px', fontWeight: 600, color: '#111827', flexShrink: 0 }}>{kw.word}</div>
                      <div style={{ flex: 1, height: '8px', background: '#eef0f3', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((kw.count / maxCount) * 100)}%`, background: i === 0 ? '#c8a96a' : '#9ca3af', borderRadius: '4px' }} />
                      </div>
                      <div style={{ width: '28px', fontSize: '11px', color: '#6b7280', textAlign: 'right', flexShrink: 0 }}>{kw.count}回</div>
                      <div style={{ fontSize: '10px', color: '#6b7280', minWidth: '120px', maxWidth: '200px' }}>{kw.context}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 日報品質スコア */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: '#eef0f3', borderRadius: '8px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flex: '0 0 auto' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: scoreColor(analysis.quality_score), lineHeight: 1 }}>
                    {analysis.quality_score}<span style={{ fontSize: '16px', color: '#6b7280' }}>/10</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>日報品質スコア</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', maxWidth: '200px' }}>{analysis.quality_comment}</div>
                  </div>
                </div>

                {/* テーマ */}
                <div style={{ background: '#eef0f3', borderRadius: '8px', padding: '14px 20px', flex: 1, minWidth: '160px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>主なテーマ</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {analysis.themes.map((t, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '12px', color: '#374151' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 管理者へのアドバイス */}
              <div style={{ background: 'rgba(200,169,106,0.08)', border: '1px solid rgba(200,169,106,0.3)', borderRadius: '6px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#c8a96a', marginBottom: '6px' }}>管理者へのアドバイス</div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>{analysis.recommendation}</div>
              </div>

            </div>
          ) : null}
        </div>
      </div>

      {/* ── 週次レポートカード ── */}
      <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px',
          background: '#eef0f3',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: weekly ? '1px solid #d1d5db' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
            <TrendingUp size={15} color="#c8a96a" />
            週次レポート
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {weekly && (
              <button onClick={() => setWeeklyOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}>
                {weeklyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {weeklyOpen ? '閉じる' : '開く'}
              </button>
            )}
            <button
              onClick={generateWeekly}
              disabled={weeklyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: weeklyLoading ? '#6b7280' : '#ffffff', background: weeklyLoading ? '#d1d5db' : '#c8a96a', border: 'none', borderRadius: '4px', padding: '6px 14px', cursor: weeklyLoading ? 'not-allowed' : 'pointer' }}
            >
              {weeklyLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
              {weekly ? '再生成' : '今週のレポートを生成'}
            </button>
          </div>
        </div>

        {weeklyError && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#e05454', fontSize: '12px' }}>
            <AlertCircle size={14} /> 生成に失敗しました。もう一度お試しください。
          </div>
        )}

        {weekly && weeklyOpen && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>対象週: <strong style={{ color: '#111827' }}>{weekly.week_range}</strong>　完了項目: <strong style={{ color: '#c8a96a' }}>{weekly.completed_count}件</strong></div>

            {weekly.completed_items.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>今週完了した項目</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {weekly.completed_items.map((item, i) => (
                    <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(74,158,92,0.1)', border: '1px solid rgba(74,158,92,0.3)', borderRadius: '12px', color: '#4a9e5c' }}>✓ {item}</span>
                  ))}
                </div>
              </div>
            )}

            {[
              { label: '日報の質', value: weekly.report_quality, color: '#5a8faa' },
              { label: '今週の学び', value: weekly.key_learnings, color: '#4a9e5c' },
              { label: '気になる点', value: weekly.concerns, color: '#e05454' },
              { label: '来週のフォーカス', value: weekly.next_focus, color: '#c8a96a' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: color, marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
