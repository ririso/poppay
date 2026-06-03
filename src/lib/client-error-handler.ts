import { ApiErrorResponse, ApiSuccessResponse, ErrorCategory, ErrorCode } from '@/types/errors';

/**
 * クライアントサイド用エラーハンドリングユーティリティ
 */

/**
 * APIレスポンスの型ガード
 */
export function isApiError(response: any): response is ApiErrorResponse {
  return response && typeof response === 'object' && response.success === false && response.error;
}

export function isApiSuccess<T>(response: any): response is ApiSuccessResponse<T> {
  return response && typeof response === 'object' && response.success === true && response.data;
}

/**
 * ユーザーフレンドリーなエラーメッセージ
 */
export const UserFriendlyMessages = {
  // バリデーションエラー
  VALIDATION_FAILED: '入力内容に不備があります。もう一度確認してください。',
  INVALID_AMOUNT: '金額は1円以上100万円以下の整数で入力してください。',
  INVALID_PAYMENT_ID: '決済IDが無効です。',
  MISSING_REQUIRED_FIELD: '必須項目が入力されていません。',

  // PayPay APIエラー
  PAYPAY_QR_CREATION_FAILED: 'QRコードの生成に失敗しました。しばらく時間をおいてからお試しください。',
  PAYPAY_PAYMENT_DETAILS_FAILED: '決済状況の取得に失敗しました。',
  PAYPAY_CANCEL_FAILED: '決済のキャンセルに失敗しました。',
  PAYPAY_CONFIGURATION_ERROR: 'システムエラーが発生しました。管理者にお問い合わせください。',

  // データベースエラー
  TRANSACTION_CREATE_FAILED: '決済処理の開始に失敗しました。',
  TRANSACTION_UPDATE_FAILED: '決済処理の更新に失敗しました。',
  TRANSACTION_NOT_FOUND: '指定された決済が見つかりませんでした。',

  // Webhookエラー
  WEBHOOK_SIGNATURE_INVALID: 'リクエストが無効です。',
  WEBHOOK_PAYLOAD_INVALID: 'リクエストデータが無効です。',

  // 認証・認可エラー
  AUTHENTICATION_REQUIRED: 'ログインが必要です。',
  AUTHORIZATION_FAILED: 'この操作を実行する権限がありません。',

  // ネットワークエラー
  NETWORK_ERROR: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',

  // 一般的なエラー
  INTERNAL_SERVER_ERROR: 'サーバーエラーが発生しました。しばらく時間をおいてからお試しください。',
  SERVICE_UNAVAILABLE: 'サービスが一時的に利用できません。しばらく時間をおいてからお試しください。',

  // デフォルト
  UNKNOWN_ERROR: '予期しないエラーが発生しました。',
} as const;

/**
 * エラータイプごとのアイコンマッピング
 */
export const ErrorIcons = {
  [ErrorCategory.VALIDATION]: '⚠️',
  [ErrorCategory.PAYPAY_API]: '💳',
  [ErrorCategory.DATABASE]: '💾',
  [ErrorCategory.AUTHENTICATION]: '🔒',
  [ErrorCategory.AUTHORIZATION]: '🚫',
  [ErrorCategory.NETWORK]: '🌐',
  [ErrorCategory.WEBHOOK]: '🔗',
  [ErrorCategory.INTERNAL]: '⚙️',
} as const;

/**
 * エラーレベルごとの色分け
 */
export const ErrorColors = {
  LOW: '#f59e0b',      // amber-500
  MEDIUM: '#ef4444',   // red-500
  HIGH: '#dc2626',     // red-600
  CRITICAL: '#991b1b', // red-800
} as const;

/**
 * クライアントエラーハンドラー
 */
export class ClientErrorHandler {
  /**
   * エラーメッセージを取得
   */
  static getMessage(error: ApiErrorResponse): string {
    const code = error.error.code as keyof typeof UserFriendlyMessages;
    return UserFriendlyMessages[code] || UserFriendlyMessages.UNKNOWN_ERROR;
  }

  /**
   * エラーアイコンを取得
   */
  static getIcon(error: ApiErrorResponse): string {
    return ErrorIcons[error.error.category] || '❌';
  }

  /**
   * エラー色を取得
   */
  static getColor(error: ApiErrorResponse): string {
    return ErrorColors[error.error.severity] || ErrorColors.MEDIUM;
  }

  /**
   * ユーザー表示用のエラー情報を取得
   */
  static getDisplayInfo(error: ApiErrorResponse) {
    return {
      id: error.error.id,
      message: this.getMessage(error),
      icon: this.getIcon(error),
      color: this.getColor(error),
      category: error.error.category,
      severity: error.error.severity,
      timestamp: error.error.timestamp,
      canRetry: this.canRetry(error),
      shouldReload: this.shouldReload(error),
    };
  }

  /**
   * リトライ可能かどうかを判定
   */
  static canRetry(error: ApiErrorResponse): boolean {
    const nonRetryableCategories = [
      ErrorCategory.VALIDATION,
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
    ];

    return !nonRetryableCategories.includes(error.error.category);
  }

  /**
   * ページリロードが必要かどうかを判定
   */
  static shouldReload(error: ApiErrorResponse): boolean {
    const reloadCategories = [
      ErrorCategory.INTERNAL,
    ];

    return reloadCategories.includes(error.error.category);
  }

  /**
   * 開発者向けの詳細情報を取得
   */
  static getDebugInfo(error: ApiErrorResponse) {
    return {
      id: error.error.id,
      code: error.error.code,
      message: error.error.message,
      category: error.error.category,
      severity: error.error.severity,
      timestamp: error.error.timestamp,
      path: error.error.path,
      details: error.error.details,
    };
  }

  /**
   * エラーレポート用データを生成
   */
  static generateErrorReport(error: ApiErrorResponse, context?: Record<string, any>) {
    return {
      errorId: error.error.id,
      timestamp: error.error.timestamp,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      error: this.getDebugInfo(error),
      context,
    };
  }
}

/**
 * fetch APIラッパー（エラーハンドリング付き）
 */
export class ApiClient {
  private static async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok || isApiError(data)) {
      if (isApiError(data)) {
        throw new ApiError(data);
      } else {
        // 通常のHTTPエラーの場合
        throw new ApiError({
          success: false,
          error: {
            id: `HTTP_${response.status}_${Date.now()}`,
            code: `HTTP_${response.status}`,
            message: `HTTP ${response.status}: ${response.statusText}`,
            category: ErrorCategory.NETWORK,
            severity: 'MEDIUM',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    return data;
  }

  static async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return this.handleResponse<T>(response);
  }

  static async post<T>(url: string, data?: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  static async put<T>(url: string, data?: any): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  static async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return this.handleResponse<T>(response);
  }
}

/**
 * カスタムエラークラス（クライアントサイド用）
 */
export class ApiError extends Error {
  public readonly apiError: ApiErrorResponse;

  constructor(apiError: ApiErrorResponse) {
    super(ClientErrorHandler.getMessage(apiError));
    this.name = 'ApiError';
    this.apiError = apiError;
  }

  get displayInfo() {
    return ClientErrorHandler.getDisplayInfo(this.apiError);
  }

  get debugInfo() {
    return ClientErrorHandler.getDebugInfo(this.apiError);
  }

  generateReport(context?: Record<string, any>) {
    return ClientErrorHandler.generateErrorReport(this.apiError, context);
  }
}

/**
 * React Hook用のエラーハンドリング
 */
export interface UseErrorHandlerOptions {
  onError?: (error: ApiError) => void;
  showToast?: boolean;
  reportError?: boolean;
}

/**
 * エラー状態の型定義
 */
export interface ErrorState {
  error: ApiError | null;
  isError: boolean;
  displayInfo: ReturnType<typeof ClientErrorHandler.getDisplayInfo> | null;
  reset: () => void;
  handleError: (error: ApiError) => void;
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export const errorUtils = {
  /**
   * 一般的なエラーをApiErrorに変換
   */
  wrapError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      const apiError: ApiErrorResponse = {
        success: false,
        error: {
          id: `CLIENT_ERROR_${Date.now()}`,
          code: 'CLIENT_ERROR',
          message: error.message,
          category: ErrorCategory.INTERNAL,
          severity: 'MEDIUM',
          timestamp: new Date().toISOString(),
        },
      };
      return new ApiError(apiError);
    }

    const apiError: ApiErrorResponse = {
      success: false,
      error: {
        id: `UNKNOWN_ERROR_${Date.now()}`,
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        category: ErrorCategory.INTERNAL,
        severity: 'MEDIUM',
        timestamp: new Date().toISOString(),
      },
    };
    return new ApiError(apiError);
  },

  /**
   * エラーの重要度を判定
   */
  isUserActionRequired(error: ApiError): boolean {
    return [ErrorCategory.VALIDATION, ErrorCategory.AUTHENTICATION].includes(
      error.apiError.error.category
    );
  },

  /**
   * エラーを自動的に報告すべきかどうかを判定
   */
  shouldAutoReport(error: ApiError): boolean {
    return ['HIGH', 'CRITICAL'].includes(error.apiError.error.severity);
  },
};