export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'trainee'
          joined_at: string
          mentor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: 'admin' | 'trainee'
          joined_at: string
          mentor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'trainee'
          joined_at?: string
          mentor_id?: string | null
          created_at?: string
        }
      }
      curriculum_items: {
        Row: {
          id: string
          phase: number
          phase_name: string
          category: string
          content: string
          trainer_type: 'self' | 'trainer' | 'mentor'
          completion_criteria: string | null
          video_url: string | null
          is_required_test: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          phase: number
          phase_name: string
          category: string
          content: string
          trainer_type: 'self' | 'trainer' | 'mentor'
          completion_criteria?: string | null
          video_url?: string | null
          is_required_test?: boolean
          sort_order: number
          created_at?: string
        }
        Update: {
          id?: string
          phase?: number
          phase_name?: string
          category?: string
          content?: string
          trainer_type?: 'self' | 'trainer' | 'mentor'
          completion_criteria?: string | null
          video_url?: string | null
          is_required_test?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      progress_records: {
        Row: {
          id: string
          employee_id: string
          item_id: string
          is_completed: boolean
          completed_at: string | null
          planned_date: string | null
          trainer_name: string | null
          memo: string | null
          is_test_passed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          item_id: string
          is_completed?: boolean
          completed_at?: string | null
          planned_date?: string | null
          trainer_name?: string | null
          memo?: string | null
          is_test_passed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          item_id?: string
          is_completed?: boolean
          completed_at?: string | null
          planned_date?: string | null
          trainer_name?: string | null
          memo?: string | null
          is_test_passed?: boolean
          created_at?: string
        }
      }
    }
  }
}

// 便利な型エイリアス
export type Employee = Database['public']['Tables']['employees']['Row']
export type CurriculumItem = Database['public']['Tables']['curriculum_items']['Row']
export type ProgressRecord = Database['public']['Tables']['progress_records']['Row']

export interface ProgressComment {
  id: string
  record_id: string
  author_id: string
  content: string
  created_at: string
  author?: Employee
}

// 進捗付き社員（ダッシュボード用）
export interface EmployeeWithProgress extends Employee {
  mentor?: Employee | null
  progress: ProgressRecord[]
  totalItems: number
  completedItems: number
  progressRate: number
  maxDelayDays: number
  currentPhase: number
}
