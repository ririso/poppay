// Database schema types for Supabase
// 開発指針 7.データ設計（最小構成）に基づく型定義

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRow,
        Insert: TransactionInsert,
        Update: TransactionUpdate
      }
    },
    Views: {
      [_ in never]: never
    },
    Functions: {
      [_ in never]: never
    },
    Enums: {
      transaction_status: 'CREATED' | 'COMPLETED' | 'FAILED' | 'EXPIRED'
    }
  }
}

// Transactions テーブル（開発指針 7.データ設計）
export type TransactionRow = {
  id: string                    // uuid (主キー)
  tenant_id: string | null      // uuid (事業者ID - SaaS化用)
  merchant_payment_id: string   // text (PayPayへ渡す一意の取引ID)
  amount: number                // integer (金額（円）)
  description: string | null    // text (メモ例：30分延長)
  status: TransactionStatus     // text (CREATED/COMPLETED/FAILED/EXPIRED)
  paypay_code_id: string | null // text (PayPayが返すcodeId)
  created_at: string            // timestamptz (生成日時)
  paid_at: string | null        // timestamptz (支払い完了日時)
}

export type TransactionInsert = {
  id?: string
  tenant_id?: string | null
  merchant_payment_id: string
  amount: number
  description?: string | null
  status?: TransactionStatus
  paypay_code_id?: string | null
  created_at?: string
  paid_at?: string | null
}

export type TransactionUpdate = {
  id?: string
  tenant_id?: string | null
  merchant_payment_id?: string
  amount?: number
  description?: string | null
  status?: TransactionStatus
  paypay_code_id?: string | null
  created_at?: string
  paid_at?: string | null
}

// Transaction Status enum (開発指針に基づく)
export type TransactionStatus = 'CREATED' | 'COMPLETED' | 'FAILED' | 'EXPIRED'

// デフォルト設定（開発指針：SaaS化を見据えた設計）
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// SQL DDL（参考：実際のテーブル作成用）
export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid DEFAULT '${DEFAULT_TENANT_ID}',
  merchant_payment_id text UNIQUE NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  description text,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'COMPLETED', 'FAILED', 'EXPIRED')),
  paypay_code_id text,
  created_at timestamptz DEFAULT NOW(),
  paid_at timestamptz,

  CONSTRAINT valid_status CHECK (status IN ('CREATED', 'COMPLETED', 'FAILED', 'EXPIRED'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_payment_id ON transactions(merchant_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- RLS (Row Level Security) 設定例（将来のマルチテナント対応用）
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
`