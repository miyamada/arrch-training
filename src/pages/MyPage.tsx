import { useAuth } from '../contexts/AuthContext'
import EmployeeDetailPage from './EmployeeDetailPage'

// 新入社員マイページ：自分のEmployeeDetailPageを表示（ID なし = 自分自身）
export default function MyPage() {
  const { employee } = useAuth()
  if (!employee) return null
  return <EmployeeDetailPage />
}
