/**
 * PopPayプロジェクト向け構造化ログシステム
 *
 * 使用例:
 * ```typescript
 * import { PopPayLogger, PaymentFlowAnalyzer, PerformanceTimer } from '@/lib/logging';
 *
 * // 基本ログ
 * PopPayLogger.info('処理開始', { userId: '123' });
 *
 * // 決済ログ
 * PopPayLogger.payment.start(merchantPaymentId, amount);
 * PopPayLogger.payment.completed({ merchantPaymentId, amount });
 *
 * // セキュリティログ
 * PopPayLogger.security.webhookVerificationFailed({
 *   type: 'webhook_signature',
 *   source: 'api_handler',
 *   riskLevel: 'high'
 * });
 *
 * // パフォーマンス測定
 * const timer = new PerformanceTimer('database_operation');
 * // ... 処理 ...
 * timer.end('success');
 *
 * // 決済フロー分析
 * PaymentFlowAnalyzer.startFlow(merchantPaymentId, amount);
 * PaymentFlowAnalyzer.recordStep(merchantPaymentId, 'validation');
 * PaymentFlowAnalyzer.completeFlow(merchantPaymentId, 'COMPLETED');
 * ```
 */

// Core logging functionality
export { default as PopPayLogger, PerformanceTimer } from './logger';
export type {
  LogLevel,
  PaymentLogMetadata,
  SecurityLogMetadata,
  PerformanceLogMetadata
} from './logger';

// Advanced logging utilities
export {
  PaymentFlowAnalyzer,
  SecurityAnalyzer,
  PerformanceAnalyzer,
  PayPayAPIAnalyzer,
  LogReporter
} from './log-utils';

/**
 * 構造化ログシステムの使用ガイドライン:
 *
 * 1. **決済関連ログ**: PopPayLogger.payment.* を使用
 *    - 決済開始: payment.start()
 *    - QR生成: payment.qrGenerated()
 *    - 決済完了: payment.completed()
 *    - 決済失敗: payment.failed()
 *    - Webhook受信: payment.webhookReceived()
 *
 * 2. **PayPay API呼び出しログ**: PopPayLogger.paypay.* を使用
 *    - API呼び出し開始: paypay.apiCall()
 *    - API呼び出し成功: paypay.apiSuccess()
 *    - API呼び出し失敗: paypay.apiError()
 *
 * 3. **セキュリティログ**: PopPayLogger.security.* を使用
 *    - Webhook署名検証失敗: security.webhookVerificationFailed()
 *    - 無効なリクエスト: security.invalidRequest()
 *    - 不正なアクセス: security.unauthorizedAccess()
 *
 * 4. **パフォーマンスログ**: PopPayLogger.performance.* を使用
 *    - または PerformanceTimer クラスを使用
 *
 * 5. **データベースログ**: PopPayLogger.database.* を使用
 *    - クエリ実行: database.query()
 *
 * 6. **エラーログ**: PopPayLogger.error() を使用
 *    - スタックトレースと詳細なコンテキストを含む
 *
 * 7. **分析機能**:
 *    - PaymentFlowAnalyzer: 決済フローの追跡と分析
 *    - SecurityAnalyzer: セキュリティイベントの監視
 *    - PerformanceAnalyzer: パフォーマンス統計
 *    - PayPayAPIAnalyzer: PayPay API呼び出し統計
 *    - LogReporter: システムヘルスレポート生成
 *
 * 8. **環境設定**:
 *    - LOG_LEVEL: ログレベル設定 (error, warn, info, debug)
 *    - NODE_ENV: 本番環境では自動的に info レベルに設定
 *    - Vercel環境では自動的にコンソール出力のみに設定
 */