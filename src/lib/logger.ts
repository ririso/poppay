import winston from 'winston';

// ログレベルの定義
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 決済関連のメタデータ型
export interface PaymentLogMetadata {
  merchantPaymentId: string;
  amount?: number;
  tenantId?: string;
  codeId?: string;
  status?: string;
  action?: string;
  duration?: number;
  error?: any;
}

// セキュリティ関連のメタデータ型
export interface SecurityLogMetadata {
  type: 'webhook_signature' | 'invalid_request' | 'unauthorized_access' | 'data_validation';
  source?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

// パフォーマンス関連のメタデータ型
export interface PerformanceLogMetadata {
  operation: string;
  duration: number;
  status: 'success' | 'failure';
  metadata?: any;
}

// Vercel環境対応のログ設定
const isVercelEnvironment = process.env.VERCEL === '1';
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Winston Logger設定
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'poppay',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Vercelではコンソールログのみ使用
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Vercel以外の環境では追加のトランスポートを設定
if (!isVercelEnvironment && process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json()
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json()
    })
  );
}

// ログヘルパークラス
export class PopPayLogger {
  /**
   * 決済フロー専用ログ
   */
  static payment = {
    /**
     * 決済開始ログ
     */
    start(merchantPaymentId: string, amount: number, tenantId?: string) {
      logger.info('Payment flow started', {
        type: 'payment_start',
        merchantPaymentId,
        amount,
        tenantId: tenantId || 'default'
      });
    },

    /**
     * PayPay QR生成ログ
     */
    qrGenerated(metadata: PaymentLogMetadata) {
      logger.info('PayPay QR code generated', {
        type: 'qr_generated',
        ...metadata
      });
    },

    /**
     * 決済完了ログ
     */
    completed(metadata: PaymentLogMetadata) {
      logger.info('Payment completed', {
        type: 'payment_completed',
        ...metadata
      });
    },

    /**
     * 決済失敗ログ
     */
    failed(metadata: PaymentLogMetadata) {
      logger.error('Payment failed', {
        type: 'payment_failed',
        ...metadata,
        stack: metadata.error?.stack
      });
    },

    /**
     * 決済キャンセルログ
     */
    cancelled(metadata: PaymentLogMetadata) {
      logger.warn('Payment cancelled', {
        type: 'payment_cancelled',
        ...metadata
      });
    },

    /**
     * Webhook受信ログ
     */
    webhookReceived(metadata: PaymentLogMetadata) {
      logger.info('Webhook received', {
        type: 'webhook_received',
        ...metadata
      });
    }
  };

  /**
   * PayPay API呼び出しログ
   */
  static paypay = {
    /**
     * API呼び出し開始
     */
    apiCall(method: string, merchantPaymentId?: string) {
      logger.info('PayPay API call started', {
        type: 'paypay_api_call',
        method,
        merchantPaymentId,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * API呼び出し成功
     */
    apiSuccess(method: string, duration: number, merchantPaymentId?: string, data?: any) {
      logger.info('PayPay API call successful', {
        type: 'paypay_api_success',
        method,
        duration,
        merchantPaymentId,
        responseSize: JSON.stringify(data || {}).length
      });
    },

    /**
     * API呼び出し失敗
     */
    apiError(method: string, error: any, merchantPaymentId?: string, duration?: number) {
      logger.error('PayPay API call failed', {
        type: 'paypay_api_error',
        method,
        merchantPaymentId,
        duration,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
    }
  };

  /**
   * セキュリティ関連ログ
   */
  static security = {
    /**
     * Webhook署名検証失敗
     */
    webhookVerificationFailed(metadata: SecurityLogMetadata) {
      logger.warn('Webhook signature verification failed', {
        type: 'security_webhook_verification_failed',
        riskLevel: 'high',
        ...metadata
      });
    },

    /**
     * 無効なリクエスト
     */
    invalidRequest(metadata: SecurityLogMetadata) {
      logger.warn('Invalid request detected', {
        type: 'security_invalid_request',
        riskLevel: 'medium',
        ...metadata
      });
    },

    /**
     * 不正なアクセス試行
     */
    unauthorizedAccess(metadata: SecurityLogMetadata) {
      logger.error('Unauthorized access attempt', {
        type: 'security_unauthorized_access',
        riskLevel: 'critical',
        ...metadata
      });
    }
  };

  /**
   * パフォーマンス測定ログ
   */
  static performance = {
    /**
     * 操作のパフォーマンス記録
     */
    record(metadata: PerformanceLogMetadata) {
      const logLevel = metadata.duration > 1000 ? 'warn' : 'info';
      logger.log(logLevel, 'Performance metrics', {
        type: 'performance',
        ...metadata
      });
    }
  };

  /**
   * データベース操作ログ
   */
  static database = {
    /**
     * クエリ実行ログ
     */
    query(operation: string, table: string, duration?: number, error?: any) {
      if (error) {
        logger.error('Database operation failed', {
          type: 'database_error',
          operation,
          table,
          duration,
          error: {
            message: error.message,
            code: error.code
          }
        });
      } else {
        logger.debug('Database operation completed', {
          type: 'database_operation',
          operation,
          table,
          duration
        });
      }
    }
  };

  /**
   * 汎用エラーログ
   */
  static error(message: string, error: any, context?: any) {
    logger.error(message, {
      type: 'application_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });
  }

  /**
   * 汎用情報ログ
   */
  static info(message: string, metadata?: any) {
    logger.info(message, {
      type: 'application_info',
      ...metadata
    });
  }

  /**
   * 汎用警告ログ
   */
  static warn(message: string, metadata?: any) {
    logger.warn(message, {
      type: 'application_warning',
      ...metadata
    });
  }

  /**
   * デバッグログ
   */
  static debug(message: string, metadata?: any) {
    logger.debug(message, {
      type: 'application_debug',
      ...metadata
    });
  }
}

// パフォーマンス測定ヘルパー
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    PopPayLogger.debug(`Starting operation: ${operation}`);
  }

  /**
   * 操作完了時にパフォーマンスログを記録
   */
  end(status: 'success' | 'failure' = 'success', metadata?: any) {
    const duration = Date.now() - this.startTime;

    PopPayLogger.performance.record({
      operation: this.operation,
      duration,
      status,
      metadata
    });

    return duration;
  }
}

// デフォルトエクスポート
export default PopPayLogger;