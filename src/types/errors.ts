import { z } from 'zod';

/**
 * エラーの分類
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  PAYPAY_API = 'PAYPAY_API',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  WEBHOOK = 'WEBHOOK',
}

/**
 * エラーの重要度
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 統一エラーレスポンス形式
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    id: string;
    code: string;
    message: string;
    details?: Record<string, any>;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: string;
    path?: string;
  };
}

/**
 * 成功レスポンス形式
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * API レスポンスの統一型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  public readonly id: string;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly details?: Record<string, any>;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);

    this.id = this.generateErrorId();
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = 'AppError';
  }

  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `ERR_${timestamp}_${random}`;
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      'VALIDATION_FAILED',
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      details
    );
    this.name = 'ValidationError';
  }
}

/**
 * PayPay APIエラー
 */
export class PayPayError extends AppError {
  constructor(message: string, payPayCode?: string, details?: Record<string, any>) {
    super(
      payPayCode || 'PAYPAY_API_ERROR',
      message,
      ErrorCategory.PAYPAY_API,
      ErrorSeverity.HIGH,
      502,
      details
    );
    this.name = 'PayPayError';
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      'DATABASE_ERROR',
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      details
    );
    this.name = 'DatabaseError';
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '認証が必要です') {
    super(
      'AUTHENTICATION_REQUIRED',
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * 認可エラー
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'この操作を実行する権限がありません') {
    super(
      'AUTHORIZATION_FAILED',
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403
    );
    this.name = 'AuthorizationError';
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      'NETWORK_ERROR',
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      503,
      details
    );
    this.name = 'NetworkError';
  }
}

/**
 * Webhookエラー
 */
export class WebhookError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      'WEBHOOK_ERROR',
      message,
      ErrorCategory.WEBHOOK,
      ErrorSeverity.HIGH,
      400,
      details
    );
    this.name = 'WebhookError';
  }
}

/**
 * 定義済みエラーコード
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_PAYMENT_ID: 'INVALID_PAYMENT_ID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // PayPay API errors
  PAYPAY_QR_CREATION_FAILED: 'PAYPAY_QR_CREATION_FAILED',
  PAYPAY_PAYMENT_DETAILS_FAILED: 'PAYPAY_PAYMENT_DETAILS_FAILED',
  PAYPAY_CANCEL_FAILED: 'PAYPAY_CANCEL_FAILED',
  PAYPAY_CONFIGURATION_ERROR: 'PAYPAY_CONFIGURATION_ERROR',

  // Database errors
  TRANSACTION_CREATE_FAILED: 'TRANSACTION_CREATE_FAILED',
  TRANSACTION_UPDATE_FAILED: 'TRANSACTION_UPDATE_FAILED',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PAYLOAD_INVALID: 'WEBHOOK_PAYLOAD_INVALID',
  WEBHOOK_SECRET_MISSING: 'WEBHOOK_SECRET_MISSING',

  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * ユーザーフレンドリーなエラーメッセージマッピング
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Validation errors
  INVALID_AMOUNT: '金額が無効です。1円以上100万円以下の整数を入力してください。',
  INVALID_PAYMENT_ID: '決済IDが無効です。',
  MISSING_REQUIRED_FIELD: '必須フィールドが不足しています。',

  // PayPay API errors
  PAYPAY_QR_CREATION_FAILED: 'QRコードの生成に失敗しました。しばらく時間をおいてからお試しください。',
  PAYPAY_PAYMENT_DETAILS_FAILED: '決済状況の取得に失敗しました。',
  PAYPAY_CANCEL_FAILED: '決済のキャンセルに失敗しました。',
  PAYPAY_CONFIGURATION_ERROR: 'PayPayの設定に問題があります。管理者にお問い合わせください。',

  // Database errors
  TRANSACTION_CREATE_FAILED: '取引記録の作成に失敗しました。',
  TRANSACTION_UPDATE_FAILED: '取引記録の更新に失敗しました。',
  TRANSACTION_NOT_FOUND: '指定された取引が見つかりませんでした。',

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID: 'Webhook署名が無効です。',
  WEBHOOK_PAYLOAD_INVALID: 'Webhookペイロードが無効です。',
  WEBHOOK_SECRET_MISSING: 'Webhook秘密鍵が設定されていません。',

  // General errors
  INTERNAL_SERVER_ERROR: 'サーバー内部エラーが発生しました。管理者にお問い合わせください。',
  SERVICE_UNAVAILABLE: 'サービスが一時的に利用できません。しばらく時間をおいてからお試しください。',
};

/**
 * Zod エラーをバリデーションエラーに変換するヘルパー
 */
export function zodErrorToValidationError(error: z.ZodError): ValidationError {
  const firstError = error.errors[0];
  const message = firstError?.message || 'バリデーションエラーが発生しました';

  return new ValidationError(message, {
    zodErrors: error.errors,
    path: firstError?.path,
  });
}

/**
 * PayPay レスポンスエラーを変換するヘルパー
 */
export function payPayResponseToError(response: any, operation: string): PayPayError {
  const code = response.resultInfo?.code;
  const message = response.resultInfo?.message || `PayPay ${operation} に失敗しました`;

  return new PayPayError(message, code, {
    resultInfo: response.resultInfo,
    operation,
  });
}