import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/database'

interface AuthContextType {
  session: Session | null
  user: User | null
  employee: Employee | null
  loading: boolean
  employeeNotFound: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [employeeNotFound, setEmployeeNotFound] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchEmployee(session.user.id, session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        setLoading(true)          // fetchEmployee中はローディング状態を維持
        setEmployeeNotFound(false)
        fetchEmployee(session.user.id, session.user.email)
      } else {
        setEmployee(null)
        setEmployeeNotFound(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchEmployee(userId: string, userEmail?: string | null) {
    // まずIDで検索（通常のパスワードログイン）
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      setEmployee(data)
      setEmployeeNotFound(false)
      setLoading(false)
      return
    }

    // Google SSOなどでIDが異なる場合はemailで検索
    // ※ RLSで id 一致のみ許可している場合、このクエリは0件になる可能性があります
    //   → Supabase ダッシュボードで employees テーブルの RLS ポリシーに
    //     「auth.email() = email」の条件を追加してください
    if (userEmail) {
      const { data: byEmail } = await supabase
        .from('employees')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle()

      if (byEmail) {
        setEmployee(byEmail)
        setEmployeeNotFound(false)
      } else {
        // 認証は成功したがemployeesテーブルに該当なし
        // → メールアドレス不一致 or RLSブロック
        setEmployee(null)
        setEmployeeNotFound(true)
        await supabase.auth.signOut()   // セッションを切ってログアウト
      }
    } else {
      setEmployee(null)
      setEmployeeNotFound(true)
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, employee, loading, employeeNotFound, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
