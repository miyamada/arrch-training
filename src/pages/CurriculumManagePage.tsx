import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CurriculumItem } from '../types/database'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import { Breadcrumb } from '../components/Layout'

type EditingItem = Partial<CurriculumItem> & { isNew?: boolean }

const TRAINER_TYPES = [
  { value: 'self', label: '自己学習' },
  { value: 'trainer', label: '教育担当' },
  { value: 'mentor', label: 'メンター（OJT）' },
]

const PHASE_NAMES = ['', '導入', '会社・商品', '資金・土地', 'ヒアリング']

export default function CurriculumManagePage() {
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('curriculum_items').select('*').order('phase').order('sort_order')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startNew() {
    const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0
    setEditing({
      isNew: true,
      phase: 1,
      phase_name: '導入',
      category: '',
      content: '',
      trainer_type: 'trainer',
      completion_criteria: '',
      video_url: '',
      is_required_test: false,
      sort_order: maxSort + 1,
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)

    const payload = {
      phase: editing.phase!,
      phase_name: PHASE_NAMES[editing.phase!],
      category: editing.category!,
      content: editing.content!,
      trainer_type: editing.trainer_type!,
      completion_criteria: editing.completion_criteria || null,
      video_url: editing.video_url || null,
      is_required_test: editing.is_required_test ?? false,
      sort_order: editing.sort_order!,
    }

    if (editing.isNew) {
      await supabase.from('curriculum_items').insert(payload)
    } else {
      await supabase.from('curriculum_items').update(payload).eq('id', editing.id!)
    }

    setEditing(null)
    load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('この項目を削除してもよいですか？関連する進捗記録もすべて削除されます。')) return
    setDeleting(id)
    await supabase.from('curriculum_items').delete().eq('id', id)
    load()
    setDeleting(null)
  }

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>読み込み中...</div>

  const grouped = [1, 2, 3, 4].map(ph => ({
    phase: ph,
    name: PHASE_NAMES[ph],
    items: items.filter(i => i.phase === ph),
  }))

  return (
    <div style={{ padding: '40px' }}>
      <Breadcrumb items={[{ label: 'ダッシュボード', to: '/' }, { label: 'カリキュラム管理' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>カリキュラム管理</h1>
        <button
          onClick={startNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', background: '#c8a96a', color: '#ffffff',
            border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> 項目を追加
        </button>
      </div>

      {/* 編集フォーム */}
      {editing && (
        <div style={{
          background: '#ffffff', border: '1px solid #c8a96a', borderRadius: '4px',
          padding: '24px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', color: '#c8a96a', margin: 0 }}>
              {editing.isNew ? '項目を追加' : '項目を編集'}
            </h2>
            <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <label>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>フェーズ</div>
              <select
                value={editing.phase}
                onChange={e => setEditing(ed => ({ ...ed, phase: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
              >
                {[1, 2, 3, 4].map(p => <option key={p} value={p}>フェーズ{p}「{PHASE_NAMES[p]}」</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>担当種別</div>
              <select
                value={editing.trainer_type}
                onChange={e => setEditing(ed => ({ ...ed, trainer_type: e.target.value as CurriculumItem['trainer_type'] }))}
                style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
              >
                {TRAINER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>カテゴリ</div>
              <input
                type="text"
                value={editing.category}
                onChange={e => setEditing(ed => ({ ...ed, category: e.target.value }))}
                placeholder="例: 初回接客基礎"
                style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
              />
            </label>
            <label>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>並び順</div>
              <input
                type="number"
                value={editing.sort_order}
                onChange={e => setEditing(ed => ({ ...ed, sort_order: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
              />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>内容</div>
            <input
              type="text"
              value={editing.content}
              onChange={e => setEditing(ed => ({ ...ed, content: e.target.value }))}
              placeholder="例: 初回接客の全体フロー理解"
              style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>完了定義</div>
            <input
              type="text"
              value={editing.completion_criteria ?? ''}
              onChange={e => setEditing(ed => ({ ...ed, completion_criteria: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>動画URL</div>
            <input
              type="url"
              value={editing.video_url ?? ''}
              onChange={e => setEditing(ed => ({ ...ed, video_url: e.target.value }))}
              placeholder="https://www.youtube.com/..."
              style={{ width: '100%', padding: '8px 10px', background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={editing.is_required_test ?? false}
              onChange={e => setEditing(ed => ({ ...ed, is_required_test: e.target.checked }))}
              style={{ accentColor: '#c8a96a' }}
            />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>★ 社内検定（合格必須）</span>
          </label>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={saving || !editing.content || !editing.category}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 20px', background: saving ? '#f0f2f5' : '#c8a96a',
                color: saving ? '#9ca3af' : '#ffffff', border: 'none', borderRadius: '4px',
                fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={13} /> {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{ padding: '9px 20px', background: 'none', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* フェーズ別一覧 */}
      {grouped.map(({ phase, name, items: phItems }) => (
        <div key={phase} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>
            フェーズ{phase}「{name}」（{phItems.length}項目）
          </h2>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            {phItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < phItems.length - 1 ? '1px solid #f0f2f5' : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '24px' }}>{item.sort_order}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#111827' }}>
                    {item.is_required_test && <span style={{ color: '#c8a96a', marginRight: '6px' }}>★</span>}
                    {item.content}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {item.category} · {item.trainer_type === 'self' ? '自己学習' : item.trainer_type === 'trainer' ? '教育担当' : 'メンター'}
                    {item.video_url && ' · 動画あり'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditing({ ...item })}
                    style={{ padding: '6px 10px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Pencil size={11} /> 編集
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    style={{ padding: '6px 10px', background: 'none', border: '1px solid rgba(224,84,84,0.3)', borderRadius: '4px', color: '#e05454', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Trash2 size={11} /> 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
