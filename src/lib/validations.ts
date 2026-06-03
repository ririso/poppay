/**
 * Zodバリデーション強化
 * 環境変数、API入力値、エラー型の厳格なバリデーション
 */

import { z } from 'zod';

// =============================================================================
// 環境変数バリデーション
// =============================================================================

export const environmentSchema = z.object({
  // PayPay設定
  PAYPAY_CLIENT_ID: z.string()
    .min(1, 'PayPay Client IDは必須です')
    .describe('PayPay API Client ID'),

  PAYPAY_CLIENT_SECRET: z.string()
    .min(1, 'PayPay Client Secretは必須です')
    .describe('PayPay API Client Secret'),

  PAYPAY_ENV: z.enum(['SANDBOX', 'STAGING', 'PRODUCTION'])
    .default('STAGING')
    .describe('PayPay環境設定'),

  // アプリケーション設定
  NEXT_PUBLIC_APP_URL: z.string()
    .url('無効なアプリケーションURLです')
    .describe('アプリケーションのベースURL'),

  // Supabase設定
  SUPABASE_URL: z.string()
    .url('無効なSupabase URLです')
    .describe('Supabase プロジェクトURL'),

  SUPABASE_SERVICE_ROLE_KEY: z.string()
    .min(1, 'Supabase Service Role Keyは必須です')
    .describe('Supabase サービスロールキー'),

  // Webhook設定（オプション）
  WEBHOOK_SECRET: z.string()
    .min(8, 'Webhook Secretは8文字以上である必要があります')
    .optional()
    .describe('Webhook検証用シークレット'),

  // Node環境
  NODE_ENV: z.enum(['development', 'test', 'production'])
    .default('development')
    .describe('Node.js実行環境'),
});

export type Environment = z.infer<typeof environmentSchema>;

// 環境変数検証関数
export function validateEnvironment(): Environment {
  try {
    return environmentSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

// =============================================================================
// API入力値バリデーション
// =============================================================================

// 決済作成リクエスト
export const createPaymentSchema = z.object({
  amount: z.number()
    .positive({ message: '金額は正の数値を入力してください' })
    .int({ message: '金額は整数で入力してください' })
    .min(1, { message: '金額は1円以上である必要があります' })
    .max(1000000, { message: '金額は100万円以下で入力してください' }),

  description: z.string()
    .max(100, { message: '説明文は100文字以下で入力してください' })
    .optional()
    .default('PayPay決済')
    .transform((val) => val?.trim() || 'PayPay決済'),

  tenantId: z.string()
    .uuid({ message: '無効なテナントIDです' })
    .optional()
    .describe('マルチテナント用のテナントID'),
});

// マーチャント決済ID
export const merchantPaymentIdSchema = z.string()
  .uuid({ message: '無効な決済IDです' })
  .describe('PayPay決済で使用する一意のID');

// 決済ステータス
export const transactionStatusSchema = z.enum([
  'CREATED',
  'COMPLETED',
  'FAILED',
  'EXPIRED'
], {
  errorMap: () => ({ message: '無効な決済ステータスです' })
});

// Webhookペイロード
export const webhookPayloadSchema = z.object({
  eventType: z.literal('payment.status.changed'),
  eventDate: z.string()
    .datetime({ message: '無効な日時形式です' }),
  data: z.object({
    merchantPaymentId: merchantPaymentIdSchema,
    paymentId: z.string().min(1),
    status: z.enum(['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED']),
    acceptedAt: z.number().positive().optional(),
    amount: z.object({
      amount: z.number().positive(),
      currency: z.literal('JPY'),
    }),
  }),
});

// =============================================================================
// エラー型バリデーション
// =============================================================================

// APIエラーコード
export const apiErrorCodeSchema = z.enum([
  // バリデーションエラー
  'VALIDATION_ERROR',
  'INVALID_AMOUNT',
  'INVALID_MERCHANT_PAYMENT_ID',

  // PayPayエラー
  'PAYPAY_API_ERROR',
  'PAYPAY_QR_CREATION_FAILED',
  'PAYPAY_PAYMENT_NOT_FOUND',

  // データベースエラー
  'DATABASE_ERROR',
  'TRANSACTION_NOT_FOUND',
  'TRANSACTION_CREATE_FAILED',
  'TRANSACTION_UPDATE_FAILED',

  // 認証・認可エラー
  'UNAUTHORIZED',
  'FORBIDDEN',

  // システムエラー
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',

  // 設定エラー
  'PAYPAY_CONFIG_MISSING',
  'ENVIRONMENT_CONFIG_ERROR',
]);

// 構造化エラー型
export const structuredErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
  timestamp: z.date().default(() => new Date()),
  requestId: z.string().optional(),
});

// =============================================================================
// 型推論
// =============================================================================

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type MerchantPaymentId = z.infer<typeof merchantPaymentIdSchema>;
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type APIErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type StructuredError = z.infer<typeof structuredErrorSchema>;

// =============================================================================
// バリデーション実行関数
// =============================================================================

export function validateCreatePayment(data: unknown): CreatePaymentRequest {
  return createPaymentSchema.parse(data);
}

export function validateMerchantPaymentId(id: unknown): MerchantPaymentId {
  return merchantPaymentIdSchema.parse(id);
}

export function validateWebhookPayload(payload: unknown): WebhookPayload {
  return webhookPayloadSchema.parse(payload);
}

export function validateTransactionStatus(status: unknown): TransactionStatus {
  return transactionStatusSchema.parse(status);
}

// =============================================================================
// エラーハンドリングユーティリティ
// =============================================================================

export function createStructuredError(
  code: APIErrorCode,
  message: string,
  details?: unknown
): StructuredError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
  };
}

export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}