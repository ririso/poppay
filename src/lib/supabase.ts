// Supabase client configuration
// 開発指針 3.技術スタック: Supabase（PostgreSQL）に基づく設定

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// クライアントサイド用のSupabaseクライアント
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// サーバーサイド用のSupabaseクライアント（Service Role Key使用）
export const createSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 設定検証
export function validateSupabaseConfig() {
  return {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}