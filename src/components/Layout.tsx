import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  ChevronRight,
} from 'lucide-react'

const adminNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/manage-employees', icon: Users, label: '社員管理' },
  { to: '/curriculum', icon: BookOpen, label: 'カリキュラム管理' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { employee, signOut } = useAuth()
  const location = useLocation()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* サイドバー */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
      }}>
        {/* ロゴ */}
        <div style={{
          padding: '28px 24px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#c8a96a',
            letterSpacing: '0.15em',
          }}>ARRCH</div>
          <div style={{
            fontSize: '10px',
            color: '#9ca3af',
            letterSpacing: '0.1em',
            marginTop: '4px',
          }}>育成カリキュラム管理</div>
        </div>

        {/* ナビゲーション */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {employee?.role === 'admin' ? (
            adminNavItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    color: isActive ? '#111827' : '#6b7280',
                    textDecoration: 'none',
                    borderLeft: isActive ? '2px solid #c8a96a' : '2px solid transparent',
                    background: isActive ? 'rgba(200,169,106,0.08)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })
          ) : (
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 24px',
                fontSize: '13px',
                color: '#111827',
                textDecoration: 'none',
                borderLeft: '2px solid #c8a96a',
                background: 'rgba(200,169,106,0.08)',
              }}
            >
              <LayoutDashboard size={15} />
              マイページ
            </Link>
          )}
        </nav>

        {/* ユーザー情報 + ログアウト */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '12px', color: '#111827', marginBottom: '2px' }}>
            {employee?.name}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
            {employee?.role === 'admin' ? '管理者' : '研修中'}
          </div>
          <button
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            <LogOut size={13} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#f7f8fa',
      }}>
        {children}
      </main>
    </div>
  )
}

// パンくずリスト
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && <ChevronRight size={12} color="#9ca3af" />}
          {item.to ? (
            <Link to={item.to} style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ fontSize: '12px', color: '#111827' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
