// Supabase client configuration
// 開発指針 3.技術スタック: Supabase（PostgreSQL）に基づく設定

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// クライアントサイド用のSupabaseクライアント
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Development fallback - warn if Supabase is not configured
if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️  Supabase not configured. Database operations will be skipped.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// サーバーサイド用のSupabaseクライアント（Service Role Key使用）
export const createSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Database operations will be skipped.')
    // Return a mock client for development
    return {
      from: () => ({
        insert: () => ({ error: null }),
        update: () => ({ error: null }),
        select: () => ({ data: null, error: new Error('Supabase not configured') }),
        eq: () => ({})
      })
    } as any
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
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    isConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
}