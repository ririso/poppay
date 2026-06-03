/**
 * API型定義の統一ファイル
 * 全APIエンドポイントのRequest/Response型を統一管理
 */

import { z } from 'zod';
import { TransactionStatus } from './database';
import { PayPayCreateQRResponse, PayPayPaymentDetailsResponse } from './paypay';

// =============================================================================
// 基本的なAPIレスポンス形式
// =============================================================================

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

// =============================================================================
// QRコード生成API (/api/create-qr)
// =============================================================================

// リクエスト型
export const CreateQRRequestSchema = z.object({
  amount: z.number()
    .positive({ message: '金額は正の数値を入力してください' })
    .int({ message: '金額は整数で入力してください' })
    .max(1000000, { message: '金額は100万円以下で入力してください' }),
  description: z.string()
    .optional()
    .default('PayPay決済')
    .transform((val) => val || 'PayPay決済'),
  tenantId: z.string().uuid().optional(),
});

export type CreateQRRequest = z.infer<typeof CreateQRRequestSchema>;

// レスポンス型
export interface CreateQRResponseData {
  qrUrl: string;
  merchantPaymentId: string;
  codeId: string;
  amount: number;
  description: string;
  expiryDate: number;
  deeplink: string;
}

export type CreateQRResponse = APIResponse<CreateQRResponseData>;

// =============================================================================
// 決済ステータス確認API (/api/status/[merchantPaymentId])
// =============================================================================

// パスパラメータ
export const MerchantPaymentIdSchema = z.string().uuid({
  message: '無効な決済IDです',
});

export type MerchantPaymentId = z.infer<typeof MerchantPaymentIdSchema>;

// レスポンス型
export interface PaymentStatusResponseData {
  status: TransactionStatus;
  amount: number;
  description: string;
  merchantPaymentId: string;
  createdAt: string;
  paidAt?: string;
  paypayCodeId?: string;
}

export type PaymentStatusResponse = APIResponse<PaymentStatusResponseData>;

// =============================================================================
// Webhook API (/api/webhook)
// =============================================================================

// Webhookペイロード型
export const WebhookPayloadSchema = z.object({
  eventType: z.literal('payment.status.changed'),
  eventDate: z.string(),
  data: z.object({
    merchantPaymentId: z.string(),
    paymentId: z.string(),
    status: z.enum(['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED']),
    acceptedAt: z.number().optional(),
    amount: z.object({
      amount: z.number(),
      currency: z.string(),
    }),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// Webhook処理結果
export interface WebhookResponseData {
  processed: boolean;
  merchantPaymentId: string;
  status: TransactionStatus;
}

export type WebhookResponse = APIResponse<WebhookResponseData>;

// =============================================================================
// 決済キャンセルAPI (/api/cancel/[merchantPaymentId])
// =============================================================================

export interface CancelPaymentResponseData {
  merchantPaymentId: string;
  status: TransactionStatus;
  cancelledAt: string;
}

export type CancelPaymentResponse = APIResponse<CancelPaymentResponseData>;

// =============================================================================
// エラーコード定数
// =============================================================================

export const API_ERROR_CODES = {
  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_MERCHANT_PAYMENT_ID: 'INVALID_MERCHANT_PAYMENT_ID',

  // PayPayエラー
  PAYPAY_API_ERROR: 'PAYPAY_API_ERROR',
  PAYPAY_QR_CREATION_FAILED: 'PAYPAY_QR_CREATION_FAILED',
  PAYPAY_PAYMENT_NOT_FOUND: 'PAYPAY_PAYMENT_NOT_FOUND',

  // データベースエラー
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_CREATE_FAILED: 'TRANSACTION_CREATE_FAILED',
  TRANSACTION_UPDATE_FAILED: 'TRANSACTION_UPDATE_FAILED',

  // 認証・認可エラー
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // システムエラー
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 設定エラー
  PAYPAY_CONFIG_MISSING: 'PAYPAY_CONFIG_MISSING',
  ENVIRONMENT_CONFIG_ERROR: 'ENVIRONMENT_CONFIG_ERROR',
} as const;

export type APIErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// =============================================================================
// ヘルパー関数
// =============================================================================

export function createSuccessResponse<T>(data: T): APISuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(
  code: APIErrorCode,
  message: string,
  details?: unknown
): APIErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

// =============================================================================
// 型ガード関数
// =============================================================================

export function isAPISuccessResponse<T>(
  response: APIResponse<T>
): response is APISuccessResponse<T> {
  return response.success === true;
}

export function isAPIErrorResponse(
  response: APIResponse
): response is APIErrorResponse {
  return response.success === false;
}

// PayPayレスポンスの型ガード
export function isPayPaySuccessResponse(
  response: PayPayCreateQRResponse | PayPayPaymentDetailsResponse
): boolean {
  return response?.resultInfo?.code === 'SUCCESS';
}

export function isValidTransactionStatus(status: string): status is TransactionStatus {
  return ['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED'].includes(status);
}

// =============================================================================
// 環境変数バリデーション用スキーマ
// =============================================================================

export const EnvironmentSchema = z.object({
  PAYPAY_CLIENT_ID: z.string().min(1, 'PayPay Client IDは必須です'),
  PAYPAY_CLIENT_SECRET: z.string().min(1, 'PayPay Client Secretは必須です'),
  PAYPAY_ENV: z.enum(['SANDBOX', 'STAGING', 'PRODUCTION']).default('STAGING'),
  NEXT_PUBLIC_APP_URL: z.string().url('無効なアプリケーションURLです'),
  SUPABASE_URL: z.string().url('無効なSupabase URLです'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role Keyは必須です'),
  WEBHOOK_SECRET: z.string().min(1, 'Webhook Secretは必須です').optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// =============================================================================
// Request/Response型の統一エクスポート
// =============================================================================

export type {
  PayPayCreateQRResponse,
  PayPayPaymentDetailsResponse,
} from './paypay';

export type {
  TransactionRow,
  TransactionInsert,
  TransactionUpdate,
  TransactionStatus,
} from './database';