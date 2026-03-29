import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

const adminNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/manage-employees', icon: Users, label: '社員管理' },
  { to: '/curriculum', icon: BookOpen, label: 'カリキュラム管理' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { employee, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ルート変更時にサイドバーを閉じる
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const sidebar = (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      ...(isMobile ? {
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.08)' : 'none',
      } : {}),
    }}>
      {/* ロゴ */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <img src="/arrch-logo.png" alt="ARRCH" style={{ height: '36px', objectFit: 'contain', display: 'block' }} />
          <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.1em', marginTop: '5px' }}>育成カリキュラム管理</div>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* ナビゲーション */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        {employee?.role === 'admin' ? (
          adminNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 24px', fontSize: '13px',
                color: isActive ? '#111827' : '#6b7280',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid #c8a96a' : '2px solid transparent',
                background: isActive ? 'rgba(200,169,106,0.08)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <Icon size={15} />{label}
              </Link>
            )
          })
        ) : (
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 24px', fontSize: '13px', color: '#111827',
            textDecoration: 'none', borderLeft: '2px solid #c8a96a',
            background: 'rgba(200,169,106,0.08)',
          }}>
            <LayoutDashboard size={15} />マイページ
          </Link>
        )}
      </nav>

      {/* ユーザー情報 + ログアウト */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '12px', color: '#111827', marginBottom: '2px' }}>{employee?.name}</div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
          {employee?.role === 'admin' ? '管理者' : '研修中'}
        </div>
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '12px', color: '#9ca3af', background: 'none',
          border: 'none', cursor: 'pointer', padding: '0',
        }}>
          <LogOut size={13} />ログアウト
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* デスクトップ: サイドバー常時表示 */}
      {!isMobile && sidebar}

      {/* モバイル: オーバーレイ + サイドバー */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
            />
          )}
          {sidebar}
        </>
      )}

      {/* メインコンテンツ */}
      <main style={{ flex: 1, overflow: 'auto', background: '#f7f8fa' }}>
        {/* モバイルヘッダー */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: '#ffffff', borderBottom: '1px solid #e5e7eb',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex' }}>
              <Menu size={20} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#c8a96a', letterSpacing: '0.1em' }}>ARRCH</span>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

// パンくずリスト
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && <ChevronRight size={12} color="#9ca3af" />}
          {item.to ? (
            <Link to={item.to} style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>{item.label}</Link>
          ) : (
            <span style={{ fontSize: '12px', color: '#111827' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
