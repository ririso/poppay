/**
 * 型ガード関数集
 * PayPayレスポンス、エラーオブジェクト、null/undefined安全な型処理
 */

import {
  PayPayCreateQRResponse,
  PayPayPaymentDetailsResponse,
  PayPayErrorResponse,
  PayPayPaymentStatus
} from './paypay';

import { TransactionStatus } from './database';
import {
  APIResponse,
  APISuccessResponse,
  APIErrorResponse,
  APIErrorCode
} from './api';

// =============================================================================
// PayPay APIレスポンス型ガード
// =============================================================================

/**
 * PayPay成功レスポンスかチェック
 */
export function isPayPaySuccessResponse<T extends { resultInfo: { code: string } }>(
  response: T | null | undefined
): response is T {
  return (
    response !== null &&
    response !== undefined &&
    'resultInfo' in response &&
    response.resultInfo?.code === 'SUCCESS'
  );
}

/**
 * PayPay QRコード作成レスポンスかチェック
 */
export function isPayPayCreateQRResponse(
  response: unknown
): response is PayPayCreateQRResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const obj = response as Record<string, unknown>;

  return (
    'resultInfo' in obj &&
    typeof obj.resultInfo === 'object' &&
    obj.resultInfo !== null &&
    'code' in obj.resultInfo &&
    'data' in obj &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    'codeId' in obj.data &&
    'url' in obj.data
  );
}

/**
 * PayPay決済詳細レスポンスかチェック
 */
export function isPayPayPaymentDetailsResponse(
  response: unknown
): response is PayPayPaymentDetailsResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const obj = response as Record<string, unknown>;

  return (
    'resultInfo' in obj &&
    typeof obj.resultInfo === 'object' &&
    obj.resultInfo !== null &&
    'code' in obj.resultInfo &&
    'data' in obj &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    'paymentId' in obj.data &&
    'status' in obj.data
  );
}

/**
 * PayPayエラーレスポンスかチェック
 */
export function isPayPayErrorResponse(
  response: unknown
): response is PayPayErrorResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const obj = response as Record<string, unknown>;

  return (
    'resultInfo' in obj &&
    typeof obj.resultInfo === 'object' &&
    obj.resultInfo !== null &&
    'code' in obj.resultInfo &&
    'message' in obj.resultInfo &&
    obj.resultInfo.code !== 'SUCCESS'
  );
}

/**
 * PayPay決済ステータスの検証
 */
export function isPayPayPaymentStatus(status: unknown): status is PayPayPaymentStatus {
  return (
    typeof status === 'string' &&
    ['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED'].includes(status)
  );
}

// =============================================================================
// API型ガード
// =============================================================================

/**
 * API成功レスポンスかチェック
 */
export function isAPISuccessResponse<T>(
  response: APIResponse<T> | null | undefined
): response is APISuccessResponse<T> {
  return (
    response !== null &&
    response !== undefined &&
    'success' in response &&
    response.success === true &&
    'data' in response
  );
}

/**
 * APIエラーレスポンスかチェック
 */
export function isAPIErrorResponse(
  response: APIResponse | null | undefined
): response is APIErrorResponse {
  return (
    response !== null &&
    response !== undefined &&
    'success' in response &&
    response.success === false &&
    'error' in response &&
    typeof response.error === 'object' &&
    response.error !== null &&
    'code' in response.error &&
    'message' in response.error
  );
}

/**
 * 有効なAPIエラーコードかチェック
 */
export function isValidAPIErrorCode(code: unknown): code is APIErrorCode {
  const validCodes = [
    'VALIDATION_ERROR',
    'INVALID_AMOUNT',
    'INVALID_MERCHANT_PAYMENT_ID',
    'PAYPAY_API_ERROR',
    'PAYPAY_QR_CREATION_FAILED',
    'PAYPAY_PAYMENT_NOT_FOUND',
    'DATABASE_ERROR',
    'TRANSACTION_NOT_FOUND',
    'TRANSACTION_CREATE_FAILED',
    'TRANSACTION_UPDATE_FAILED',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'INTERNAL_SERVER_ERROR',
    'SERVICE_UNAVAILABLE',
    'PAYPAY_CONFIG_MISSING',
    'ENVIRONMENT_CONFIG_ERROR',
  ];

  return typeof code === 'string' && validCodes.includes(code as APIErrorCode);
}

// =============================================================================
// トランザクション型ガード
// =============================================================================

/**
 * 有効なトランザクションステータスかチェック
 */
export function isValidTransactionStatus(status: unknown): status is TransactionStatus {
  return (
    typeof status === 'string' &&
    ['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED'].includes(status)
  );
}

/**
 * UUIDかチェック
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 正の整数かチェック
 */
export function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

// =============================================================================
// null/undefined安全な型処理
// =============================================================================

/**
 * null/undefinedを除外する型ガード
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 空文字列でない文字列かチェック
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 有効な数値かチェック（NaN、Infinityを除外）
 */
export function isValidNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !Number.isNaN(value) &&
    Number.isFinite(value)
  );
}

/**
 * 有効な日付文字列かチェック
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * オブジェクトかチェック（nullや配列を除外）
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * 空でないオブジェクトかチェック
 */
export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    Object.keys(value).length > 0
  );
}

// =============================================================================
// エラーオブジェクト型ガード
// =============================================================================

/**
 * Errorオブジェクトかチェック
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * エラーライクなオブジェクトかチェック
 */
export function isErrorLike(value: unknown): value is { message: string; name?: string; stack?: string } {
  return (
    isPlainObject(value) &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

/**
 * ZodErrorかチェック（動的インポートなしバージョン）
 */
export function isZodErrorLike(value: unknown): value is {
  issues: Array<{ path: (string | number)[]; message: string }>;
  errors: Array<{ path: (string | number)[]; message: string }>;
} {
  return (
    isPlainObject(value) &&
    ('issues' in value || 'errors' in value) &&
    Array.isArray((value as any).issues || (value as any).errors)
  );
}

// =============================================================================
// 安全な型変換ユーティリティ
// =============================================================================

/**
 * 安全に文字列に変換
 */
export function safeToString(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return '[object Object]';
  }
}

/**
 * 安全に数値に変換
 */
export function safeToNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return isValidNumber(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return isValidNumber(parsed) ? parsed : null;
  }

  return null;
}

/**
 * 安全に日付に変換
 */
export function safeToDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime()) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) ? date : null;
  }

  return null;
}

/**
 * デフォルト値付きの安全な値取得
 */
export function safeGet<T, U>(
  value: T | null | undefined,
  defaultValue: U
): T | U {
  return isNotNullOrUndefined(value) ? value : defaultValue;
}

/**
 * ネストしたプロパティの安全な取得
 */
export function safeGetNested<T>(
  obj: Record<string, unknown> | null | undefined,
  path: string[],
  defaultValue: T
): T {
  if (!isPlainObject(obj)) return defaultValue;

  let current: unknown = obj;

  for (const key of path) {
    if (!isPlainObject(current) || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return isNotNullOrUndefined(current) ? (current as T) : defaultValue;
}