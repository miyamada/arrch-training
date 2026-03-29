import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/database'
import { format, parseISO } from 'date-fns'
import { Plus, X, Pencil } from 'lucide-react'
import { Breadcrumb } from '../components/Layout'

export default function EmployeeManagePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', joined_at: '', mentor_id: '', role: 'trainee' as 'admin' | 'trainee',
  })
  const [error, setError] = useState('')

  // 編集
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [editForm, setEditForm] = useState({ name: '', joined_at: '', mentor_id: '', role: 'trainee' as 'admin' | 'trainee' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function load() {
    const { data } = await supabase.from('employees').select('*').order('joined_at', { ascending: false })
    setEmployees(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const admins = employees.filter(e => e.role === 'admin')
  const trainees = employees.filter(e => e.role === 'trainee')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authErr || !authData.user) {
      setError(authErr?.message ?? 'ユーザー作成に失敗しました')
      setSaving(false)
      return
    }

    const { error: empErr } = await supabase.from('employees').insert({
      id: authData.user.id,
      name: form.name,
      email: form.email,
      role: form.role,
      joined_at: form.joined_at,
      mentor_id: form.mentor_id || null,
    })

    if (empErr) {
      setError(empErr.message)
      setSaving(false)
      return
    }

    const { data: currItems } = await supabase.from('curriculum_items').select('id')
    if (currItems && currItems.length > 0) {
      const records = currItems.map(item => ({
        employee_id: authData.user!.id,
        item_id: item.id,
        is_completed: false,
      }))
      await supabase.from('progress_records').insert(records)
    }

    setShowForm(false)
    setForm({ name: '', email: '', password: '', joined_at: '', mentor_id: '', role: 'trainee' })
    load()
    setSaving(false)
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp)
    setEditForm({ name: emp.name, joined_at: emp.joined_at, mentor_id: emp.mentor_id ?? '', role: emp.role })
    setEditError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditSaving(true)
    setEditError('')

    const { error } = await supabase.from('employees').update({
      name: editForm.name,
      joined_at: editForm.joined_at,
      mentor_id: editForm.mentor_id || null,
      role: editForm.role,
    }).eq('id', editTarget.id)

    if (error) {
      setEditError(error.message)
      setEditSaving(false)
      return
    }

    setEditTarget(null)
    load()
    setEditSaving(false)
  }

  if (loading) return <div style={{ padding: '40px', color: '#4b5563' }}>読み込み中...</div>

  return (
    <div style={{ padding: '24px 40px' }}>
      <Breadcrumb items={[{ label: 'ダッシュボード', to: '/' }, { label: '社員管理' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>社員管理</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', background: '#c8a96a', color: '#ffffff',
            border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> 社員を追加
        </button>
      </div>

      {/* 社員追加フォーム */}
      {showForm && (
        <div style={{
          background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px',
          padding: '24px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', color: '#111827', margin: 0 }}>新しい社員を追加</h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              {[
                { label: '名前', field: 'name', type: 'text', placeholder: '山田 太郎' },
                { label: 'メールアドレス', field: 'email', type: 'email', placeholder: 'yamada@arrch.net' },
                { label: 'パスワード', field: 'password', type: 'password', placeholder: '••••••••' },
                { label: '入社日', field: 'joined_at', type: 'date', placeholder: '' },
              ].map(({ label, field, type, placeholder }) => (
                <label key={field}>
                  <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>{label}</div>
                  <input
                    type={type}
                    required
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px',
                      color: '#111827', fontSize: '13px',
                    }}
                  />
                </label>
              ))}
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>担当メンター</div>
                <select
                  value={form.mentor_id}
                  onChange={e => setForm(f => ({ ...f, mentor_id: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
                >
                  <option value="">未設定</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>ロール</div>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'trainee' }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }}
                >
                  <option value="trainee">新入社員（trainee）</option>
                  <option value="admin">管理者（admin）</option>
                </select>
              </label>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(224,84,84,0.07)', border: '1px solid rgba(224,84,84,0.3)', borderRadius: '4px', color: '#e05454', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: saving ? '#d1d5db' : '#c8a96a', color: saving ? '#6b7280' : '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '追加中...' : '社員を追加'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', background: 'none', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編集フォーム */}
      {editTarget && (
        <div style={{ background: '#ffffff', border: '1px solid #c8a96a', borderRadius: '4px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', color: '#c8a96a', margin: 0 }}>「{editTarget.name}」を編集</h2>
            <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleEdit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>名前</div>
                <input type="text" required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }} />
              </label>
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>入社日</div>
                <input type="date" required value={editForm.joined_at} onChange={e => setEditForm(f => ({ ...f, joined_at: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }} />
              </label>
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>担当メンター</div>
                <select value={editForm.mentor_id} onChange={e => setEditForm(f => ({ ...f, mentor_id: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }}>
                  <option value="">未設定</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label>
                <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>ロール</div>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'admin' | 'trainee' }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#eef0f3', border: '1px solid #d1d5db', borderRadius: '4px', color: '#111827', fontSize: '13px' }}>
                  <option value="trainee">新入社員（trainee）</option>
                  <option value="admin">管理者（admin）</option>
                </select>
              </label>
            </div>
            {editError && (
              <div style={{ padding: '10px 14px', background: 'rgba(224,84,84,0.07)', border: '1px solid rgba(224,84,84,0.3)', borderRadius: '4px', color: '#e05454', fontSize: '13px', marginBottom: '16px' }}>{editError}</div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={editSaving} style={{ padding: '9px 20px', background: editSaving ? '#d1d5db' : '#c8a96a', color: editSaving ? '#6b7280' : '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                {editSaving ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={() => setEditTarget(null)} style={{ padding: '9px 20px', background: 'none', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 研修中 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.1em', marginBottom: '12px' }}>
          研修中（{trainees.length}名）
        </h2>
        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
          {trainees.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>研修中の社員はいません</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d1d5db', background: '#eef0f3' }}>
                  {['名前', 'メール', '入社日', 'メンター', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainees.map((emp, i) => {
                  const m = employees.find(e => e.id === emp.mentor_id)
                  return (
                    <tr key={emp.id} style={{ borderBottom: i < trainees.length - 1 ? '1px solid #d1d5db' : 'none' }}>
                      <td style={{ padding: '12px 16px', color: '#111827' }}>{emp.name}</td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>{emp.email}</td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>{format(parseISO(emp.joined_at), 'yyyy/MM/dd')}</td>
                      <td style={{ padding: '12px 16px', color: '#c8a96a' }}>{m?.name ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => openEdit(emp)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', color: '#4b5563', cursor: 'pointer', fontSize: '11px' }}>
                          <Pencil size={11} /> 編集
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 管理者 */}
      <section>
        <h2 style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.1em', marginBottom: '12px' }}>
          管理者・メンター（{admins.length}名）
        </h2>
        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db', background: '#eef0f3' }}>
                {['名前', 'メール', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((emp, i) => (
                <tr key={emp.id} style={{ borderBottom: i < admins.length - 1 ? '1px solid #d1d5db' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#111827' }}>{emp.name}</td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{emp.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openEdit(emp)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', color: '#4b5563', cursor: 'pointer', fontSize: '11px' }}>
                      <Pencil size={11} /> 編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
