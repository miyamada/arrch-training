import { Calendar, ArrowRight, ArrowDown, ClipboardCheck, Briefcase, RotateCcw } from 'lucide-react'

const GOLD = '#c8a96a'
const GREEN = '#4a9e5c'
const BLUE = '#5a8faa'

const schedule = [
  { week: '1週目', test: 'アイスブレイク テスト', practice: '商談で実践' },
  { week: '2週目', test: '前半テスト（アイスブレイク＋ヒアリング）', practice: '商談で実践' },
  { week: '3週目', test: '会社紹介・商品紹介 テスト', practice: '商談で実践' },
  { week: '4週目', test: '4ステップ・建物案内 テスト', practice: '商談で実践' },
  { week: '5週目', test: '全体テスト', practice: null },
]

const steps = [
  {
    label: 'STEP 1',
    title: '前半テスト',
    items: ['アイスブレイク', 'ヒアリング'],
    note: 'アイスブレイク合格後、ヒアリング練習開始',
    color: GOLD,
  },
  {
    label: 'STEP 2',
    title: '会社紹介・商品紹介テスト',
    items: ['会社紹介', '商品紹介'],
    note: '前半テスト合格後、練習開始 → 翌週テスト',
    color: GREEN,
  },
  {
    label: 'STEP 3',
    title: '4ステップ・建物案内テスト',
    items: ['4ステップ', '建物案内'],
    note: '会社紹介・商品紹介テスト合格後に進行',
    color: BLUE,
  },
  {
    label: 'STEP 4',
    title: '全体テスト',
    items: ['全項目の総合テスト'],
    note: '全ステップ合格後、最終テスト',
    color: '#aa5a8f',
  },
]

export default function CurriculumOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── 週次サイクル図 ── */}
      <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '28px 24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '20px', borderBottom: `2px solid ${GOLD}`, paddingBottom: '8px' }}>
          育成サイクル
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* 火曜 */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`, border: `2px solid ${GOLD}`,
            borderRadius: '12px', padding: '16px 20px', minWidth: '140px',
          }}>
            <Calendar size={22} color={GOLD} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>毎週 火曜日</span>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>アドバイザー会議</span>
          </div>

          <ArrowRight size={20} color="#9ca3af" />

          {/* テスト */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: `linear-gradient(135deg, ${GREEN}18, ${GREEN}08)`, border: `2px solid ${GREEN}`,
            borderRadius: '12px', padding: '16px 20px', minWidth: '140px',
          }}>
            <ClipboardCheck size={22} color={GREEN} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: GREEN }}>ショートテスト</span>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>知識・実技の確認</span>
          </div>

          <ArrowRight size={20} color="#9ca3af" />

          {/* 土日 */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: `linear-gradient(135deg, ${BLUE}18, ${BLUE}08)`, border: `2px solid ${BLUE}`,
            borderRadius: '12px', padding: '16px 20px', minWidth: '140px',
          }}>
            <Briefcase size={22} color={BLUE} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: BLUE }}>土日</span>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>商談で実践</span>
          </div>

          <RotateCcw size={18} color="#9ca3af" />
        </div>
      </div>

      {/* ── カレンダー形式スケジュール ── */}
      <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '28px 24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '20px', borderBottom: `2px solid ${GOLD}`, paddingBottom: '8px' }}>
          週次スケジュール
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '2px solid #e5e7eb', width: '80px' }}>週</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: GOLD, fontWeight: 700, borderBottom: `2px solid ${GOLD}` }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> 火曜：アドバイザー会議
                  </span>
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: BLUE, fontWeight: 700, borderBottom: `2px solid ${BLUE}`, width: '160px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} /> 土日：実践
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < schedule.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{
                    padding: '12px', fontWeight: 700, color: '#374151',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                  }}>
                    {row.week}
                  </td>
                  <td style={{
                    padding: '12px',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                  }}>
                    <span style={{
                      display: 'inline-block', padding: '5px 14px',
                      background: row.week === '5週目' ? `${steps[3].color}14` : `${GOLD}14`,
                      border: `1px solid ${row.week === '5週目' ? steps[3].color : GOLD}40`,
                      borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      color: row.week === '5週目' ? steps[3].color : '#374151',
                    }}>
                      {row.test}
                    </span>
                  </td>
                  <td style={{
                    padding: '12px',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                  }}>
                    {row.practice ? (
                      <span style={{
                        display: 'inline-block', padding: '5px 14px',
                        background: `${BLUE}14`, border: `1px solid ${BLUE}40`,
                        borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: BLUE,
                      }}>
                        {row.practice}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── テスト進行ステップ ── */}
      <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '28px 24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '20px', borderBottom: `2px solid ${GOLD}`, paddingBottom: '8px' }}>
          ショートテスト 進行フロー
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {steps.map((step, i) => (
            <div key={i}>
              {/* ステップカード */}
              <div style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                padding: '20px', borderRadius: '10px',
                background: `${step.color}08`, border: `1px solid ${step.color}30`,
              }}>
                {/* ラベル */}
                <div style={{
                  flexShrink: 0, width: '64px', height: '64px',
                  borderRadius: '50%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: step.color, color: '#fff',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>{step.label.split(' ')[0]}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>{step.label.split(' ')[1]}</span>
                </div>
                {/* 内容 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                    {step.title}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {step.items.map((item, j) => (
                      <span key={j} style={{
                        padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                        background: '#fff', border: `1px solid ${step.color}50`,
                        borderRadius: '4px', color: '#374151',
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{step.note}</div>
                </div>
              </div>

              {/* 合格矢印 */}
              {i < steps.length - 1 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 0', color: '#9ca3af',
                }}>
                  <ArrowDown size={18} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: GREEN }}>合格</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
