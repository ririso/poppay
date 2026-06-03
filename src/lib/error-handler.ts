import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AppError,
  ApiErrorResponse,
  ApiSuccessResponse,
  ValidationError,
  PayPayError,
  DatabaseError,
  NetworkError,
  WebhookError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
  ErrorMessages,
  zodErrorToValidationError,
  payPayResponseToError,
} from '@/types/errors';

/**
 * 統一エラーハンドリングクラス
 */
export class ApiErrorHandler {
  /**
   * エラーIDを生成
   */
  private static generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `ERR_${timestamp}_${random}`;
  }

  /**
   * エラーを統一形式でログに記録
   */
  private static logError(error: Error | AppError, context?: Record<string, any>): void {
    const isAppError = error instanceof AppError;
    const errorLog = {
      id: isAppError ? error.id : ApiErrorHandler.generateErrorId(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(isAppError && {
        code: error.code,
        category: error.category,
        severity: error.severity,
        details: error.details,
      }),
      ...context,
    };

    // 重要度に応じてログレベルを調整
    if (isAppError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          console.error('[CRITICAL ERROR]', errorLog);
          break;
        case ErrorSeverity.HIGH:
          console.error('[HIGH ERROR]', errorLog);
          break;
        case ErrorSeverity.MEDIUM:
          console.warn('[MEDIUM ERROR]', errorLog);
          break;
        case ErrorSeverity.LOW:
          console.log('[LOW ERROR]', errorLog);
          break;
        default:
          console.error('[ERROR]', errorLog);
      }
    } else {
      console.error('[UNHANDLED ERROR]', errorLog);
    }
  }

  /**
   * 成功レスポンスを生成
   */
  static success<T>(data: T): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * エラーレスポンスを生成
   */
  static error(error: Error | AppError, path?: string): ApiErrorResponse {
    const isAppError = error instanceof AppError;

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        id: isAppError ? error.id : ApiErrorHandler.generateErrorId(),
        code: isAppError ? error.code : ErrorCodes.INTERNAL_SERVER_ERROR,
        message: isAppError ? error.message : ErrorMessages.INTERNAL_SERVER_ERROR,
        category: isAppError ? error.category : ErrorCategory.INTERNAL,
        severity: isAppError ? error.severity : ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        ...(isAppError && error.details && { details: error.details }),
        ...(path && { path }),
      },
    };

    return errorResponse;
  }

  /**
   * NextResponseを生成
   */
  static toNextResponse<T>(
    result: ApiSuccessResponse<T> | ApiErrorResponse,
    headers?: Record<string, string>
  ): NextResponse {
    const status = result.success ? 200 : (result as ApiErrorResponse).error.category === ErrorCategory.VALIDATION ? 400 : 500;

    if (!result.success) {
      // エラーの場合はAppErrorインスタンスを作成してログに記録
      const errorData = (result as ApiErrorResponse).error;
      const appError = new AppError(
        errorData.code,
        errorData.message,
        errorData.category,
        errorData.severity,
        status,
        errorData.details
      );
      appError.id = errorData.id; // 既存のIDを使用
      ApiErrorHandler.logError(appError, { path: errorData.path });
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : this.getStatusCodeFromError(result),
      headers
    });
  }

  /**
   * エラーからHTTPステータスコードを取得
   */
  private static getStatusCodeFromError(errorResponse: ApiErrorResponse): number {
    const { category } = errorResponse.error;

    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.DATABASE:
        return 500;
      case ErrorCategory.PAYPAY_API:
        return 502;
      case ErrorCategory.NETWORK:
        return 503;
      case ErrorCategory.WEBHOOK:
        return 400;
      case ErrorCategory.INTERNAL:
      default:
        return 500;
    }
  }

  /**
   * エラーハンドリングラッパー（API関数用）
   */
  static async handleApi<T>(
    handler: () => Promise<T>,
    path?: string
  ): Promise<NextResponse> {
    try {
      const result = await handler();
      const successResponse = ApiErrorHandler.success(result);
      return ApiErrorHandler.toNextResponse(successResponse);
    } catch (error) {
      // Zodバリデーションエラーの場合
      if (error instanceof z.ZodError) {
        const validationError = zodErrorToValidationError(error);
        const errorResponse = ApiErrorHandler.error(validationError, path);
        return ApiErrorHandler.toNextResponse(errorResponse);
      }

      // AppErrorの場合
      if (error instanceof AppError) {
        const errorResponse = ApiErrorHandler.error(error, path);
        return ApiErrorHandler.toNextResponse(errorResponse);
      }

      // 一般的なエラーの場合
      const generalError = new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        ErrorMessages.INTERNAL_SERVER_ERROR,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH
      );

      ApiErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        originalError: error,
        path,
      });

      const errorResponse = ApiErrorHandler.error(generalError, path);
      return ApiErrorHandler.toNextResponse(errorResponse);
    }
  }

  /**
   * バリデーションエラーヘルパー
   */
  static validationError(message: string, details?: Record<string, any>): ValidationError {
    return new ValidationError(message, details);
  }

  /**
   * PayPayエラーヘルパー
   */
  static payPayError(response: any, operation: string): PayPayError {
    return payPayResponseToError(response, operation);
  }

  /**
   * データベースエラーヘルパー
   */
  static databaseError(message: string, details?: Record<string, any>): DatabaseError {
    return new DatabaseError(message, details);
  }

  /**
   * Webhookエラーヘルパー
   */
  static webhookError(message: string, details?: Record<string, any>): WebhookError {
    return new WebhookError(message, details);
  }

  /**
   * ネットワークエラーヘルパー
   */
  static networkError(message: string, details?: Record<string, any>): NetworkError {
    return new NetworkError(message, details);
  }

  /**
   * PayPayレスポンスが成功かチェック
   */
  static isPayPaySuccess(response: any): boolean {
    return response?.resultInfo?.code === 'SUCCESS';
  }

  /**
   * PayPayレスポンスからエラーを抽出
   */
  static extractPayPayError(response: any, operation: string): PayPayError {
    if (ApiErrorHandler.isPayPaySuccess(response)) {
      throw new Error('PayPayレスポンスは成功です');
    }
    return ApiErrorHandler.payPayError(response, operation);
  }

  /**
   * 環境設定チェック
   */
  static validateEnvironment(requiredEnvs: string[]): void {
    const missing = requiredEnvs.filter(env => !process.env[env]);

    if (missing.length > 0) {
      throw new AppError(
        ErrorCodes.PAYPAY_CONFIGURATION_ERROR,
        `必要な環境変数が設定されていません: ${missing.join(', ')}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.CRITICAL,
        500,
        { missingVariables: missing }
      );
    }
  }

  /**
   * Webhook署名検証エラー
   */
  static webhookSignatureError(): WebhookError {
    return new WebhookError(
      ErrorMessages.WEBHOOK_SIGNATURE_INVALID,
      { code: ErrorCodes.WEBHOOK_SIGNATURE_INVALID }
    );
  }

  /**
   * Webhookペイロード検証エラー
   */
  static webhookPayloadError(details?: Record<string, any>): WebhookError {
    return new WebhookError(
      ErrorMessages.WEBHOOK_PAYLOAD_INVALID,
      { code: ErrorCodes.WEBHOOK_PAYLOAD_INVALID, ...details }
    );
  }

  /**
   * トランザクション作成エラー
   */
  static transactionCreateError(details?: Record<string, any>): DatabaseError {
    return new DatabaseError(
      ErrorMessages.TRANSACTION_CREATE_FAILED,
      { code: ErrorCodes.TRANSACTION_CREATE_FAILED, ...details }
    );
  }

  /**
   * トランザクション更新エラー
   */
  static transactionUpdateError(details?: Record<string, any>): DatabaseError {
    return new DatabaseError(
      ErrorMessages.TRANSACTION_UPDATE_FAILED,
      { code: ErrorCodes.TRANSACTION_UPDATE_FAILED, ...details }
    );
  }

  /**
   * トランザクション未発見エラー
   */
  static transactionNotFoundError(merchantPaymentId: string): DatabaseError {
    return new DatabaseError(
      ErrorMessages.TRANSACTION_NOT_FOUND,
      {
        code: ErrorCodes.TRANSACTION_NOT_FOUND,
        merchantPaymentId
      }
    );
  }
}

/**
 * エクスポート用のヘルパー関数
 */
export const createSuccessResponse = ApiErrorHandler.success;
export const createErrorResponse = ApiErrorHandler.error;
export const handleApiRequest = ApiErrorHandler.handleApi;