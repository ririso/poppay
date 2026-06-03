/**
 * トランザクション関連の型定義
 * データベース型とAPI型の橋渡し
 */

import { TransactionRow } from './database';

// データベースの Row 型をベースにしたTransaction型（API用）
export interface Transaction extends TransactionRow {
  // すべてのフィールドはTransactionRowから継承
}

// 型の統一化（重複排除）
// API型定義は /src/types/api.ts に移動しました
// CreateQRRequest, CreateQRResponse, PaymentStatusResponse は api.ts を使用してください

// 型エイリアス（後方互換性のため）
export type { TransactionStatus } from './database';

// =============================================================================
// 型変換ユーティリティ
// =============================================================================

/**
 * データベースのTransactionRowをAPI用のTransaction型に変換
 */
export function toTransactionAPI(dbTransaction: TransactionRow): Transaction {
  return {
    ...dbTransaction,
  };
}

/**
 * Transaction配列をAPI用に変換
 */
export function toTransactionsAPI(dbTransactions: TransactionRow[]): Transaction[] {
  return dbTransactions.map(toTransactionAPI);
}