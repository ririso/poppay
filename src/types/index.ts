/**
 * 型定義の統一エクスポートファイル
 * すべての型定義を一元管理し、import/exportを最適化
 */

// =============================================================================
// データベース関連型
// =============================================================================
export type {
  Database,
  TransactionRow,
  TransactionInsert,
  TransactionUpdate,
  TransactionStatus,
} from './database';

export { DEFAULT_TENANT_ID, CREATE_TRANSACTIONS_TABLE } from './database';

// =============================================================================
// PayPay関連型
// =============================================================================
export type {
  PayPayConfig,
  PayPayCreateQRRequest,
  PayPayCreateQRResponse,
  PayPayPaymentDetailsResponse,
  PayPayPaymentStatus,
  PayPayWebhookPayload,
  PayPayErrorResponse,
  PayPayEnvironment,
} from './paypay';

export { PAYPAY_ENDPOINTS } from './paypay';

// =============================================================================
// トランザクション関連型
// =============================================================================
export type { Transaction } from './transaction';
export { toTransactionAPI, toTransactionsAPI } from './transaction';

// =============================================================================
// API関連型
// =============================================================================
export type {
  APIResponse,
  APISuccessResponse,
  APIErrorResponse,
  CreateQRRequest,
  CreateQRResponseData,
  CreateQRResponse,
  MerchantPaymentId,
  PaymentStatusResponseData,
  PaymentStatusResponse,
  WebhookPayload,
  WebhookResponseData,
  WebhookResponse,
  CancelPaymentResponseData,
  CancelPaymentResponse,
  APIErrorCode,
  Environment,
} from './api';

export {
  CreateQRRequestSchema,
  MerchantPaymentIdSchema,
  WebhookPayloadSchema,
  EnvironmentSchema,
  API_ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  isAPISuccessResponse,
  isAPIErrorResponse,
  isPayPaySuccessResponse,
  isValidTransactionStatus,
} from './api';

// =============================================================================
// バリデーション関連型・関数 (lib/validations.tsから)
// =============================================================================
export type {
  CreatePaymentRequest,
  StructuredError,
  Environment as ValidatedEnvironment,
  APIErrorCode as ValidatedAPIErrorCode,
} from '../lib/validations';

export {
  environmentSchema,
  createPaymentSchema,
  merchantPaymentIdSchema,
  transactionStatusSchema,
  webhookPayloadSchema,
  apiErrorCodeSchema,
  structuredErrorSchema,
  validateEnvironment,
  validateCreatePayment,
  validateMerchantPaymentId,
  validateWebhookPayload,
  validateTransactionStatus,
  createStructuredError,
  isZodError,
  formatZodError,
} from '../lib/validations';

// =============================================================================
// 型ガード関数
// =============================================================================
export {
  // PayPay型ガード
  isPayPaySuccessResponse as isPayPaySuccessResponseStrict,
  isPayPayCreateQRResponse,
  isPayPayPaymentDetailsResponse,
  isPayPayErrorResponse,
  isPayPayPaymentStatus,

  // API型ガード
  isAPISuccessResponse as isAPISuccessResponseStrict,
  isAPIErrorResponse as isAPIErrorResponseStrict,
  isValidAPIErrorCode,

  // 基本型ガード
  isValidUUID,
  isPositiveInteger,
  isNotNullOrUndefined,
  isNonEmptyString,
  isValidNumber,
  isValidDateString,
  isPlainObject,
  isNonEmptyObject,

  // エラー型ガード
  isError,
  isErrorLike,
  isZodErrorLike,

  // 安全な型変換
  safeToString,
  safeToNumber,
  safeToDate,
  safeGet,
  safeGetNested,
} from './guards';

// =============================================================================
// 再エクスポート用型エイリアス（後方互換性）
// =============================================================================

/**
 * @deprecated Use APIResponse<T> instead
 */
export type ApiResponse<T = unknown> = APIResponse<T>;

/**
 * @deprecated Use CreateQRRequest instead
 */
export type CreateQRRequestLegacy = CreateQRRequest;

/**
 * @deprecated Use PaymentStatusResponseData instead
 */
export type PaymentStatusLegacy = PaymentStatusResponseData;

// =============================================================================
// 型ヘルパー・ユーティリティ型
// =============================================================================

/**
 * 部分的にnull許可する型
 */
export type PartiallyNullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * 必須フィールドを指定する型
 */
export type RequiredFields<T, K extends keyof T> = T & {
  [P in K]-?: NonNullable<T[P]>;
};

/**
 * 日付文字列フィールドを持つ型
 */
export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

/**
 * ページネーション用の型
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  offset?: number;
};

export type PaginatedResponse<T> = APISuccessResponse<{
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}>;

/**
 * ソート用の型
 */
export type SortOrder = 'asc' | 'desc';

export type SortParams<T> = {
  sortBy?: keyof T;
  sortOrder?: SortOrder;
};

/**
 * フィルタリング用の型
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'ilike';

export type FilterParam<T> = {
  [K in keyof T]?: {
    operator: FilterOperator;
    value: T[K] | T[K][];
  };
};

// =============================================================================
// 環境別設定型
// =============================================================================

export type EnvironmentConfig = {
  development: {
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      enableConsole: boolean;
      enableFile: boolean;
    };
    database: {
      enableMockMode: boolean;
      skipMigrations: boolean;
    };
    paypay: {
      environment: 'SANDBOX' | 'STAGING';
      enableTestMode: boolean;
    };
  };
  production: {
    logging: {
      level: 'info' | 'warn' | 'error';
      enableConsole: boolean;
      enableFile: boolean;
    };
    database: {
      enableMockMode: false;
      skipMigrations: false;
    };
    paypay: {
      environment: 'PRODUCTION';
      enableTestMode: false;
    };
  };
};

// =============================================================================
// 設定デフォルト値
// =============================================================================

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  offset: 0,
} as const;

export const DEFAULT_SORT = {
  sortBy: 'created_at' as const,
  sortOrder: 'desc' as const,
} as const;

export const SUPPORTED_CURRENCIES = ['JPY'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const TRANSACTION_STATUS_LABELS = {
  CREATED: '作成済み',
  COMPLETED: '完了',
  FAILED: '失敗',
  EXPIRED: '期限切れ',
} as const;