import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#c8a96a',
            letterSpacing: '0.2em',
            marginBottom: '8px',
          }}>
            ARRCH
          </div>
          <div style={{
            fontSize: '11px',
            color: '#9ca3af',
            letterSpacing: '0.15em',
          }}>
            育成カリキュラム管理システム
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#6b7280',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                color: '#111827',
                fontSize: '14px',
                outline: 'none',
              }}
              placeholder="example@arrch.net"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#6b7280',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                color: '#111827',
                fontSize: '14px',
                outline: 'none',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(224,84,84,0.07)',
              border: '1px solid rgba(224,84,84,0.3)',
              borderRadius: '4px',
              color: '#e05454',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: loading ? '#f0f2f5' : '#c8a96a',
              color: loading ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
