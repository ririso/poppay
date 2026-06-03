import PopPayLogger, { PaymentLogMetadata } from './logger';

/**
 * 決済フロー分析用のログユーティリティ
 */
export class PaymentFlowAnalyzer {
  private static activeFlows = new Map<string, {
    startTime: number;
    amount: number;
    tenantId?: string;
    steps: string[];
  }>();

  /**
   * 決済フローの開始を記録
   */
  static startFlow(merchantPaymentId: string, amount: number, tenantId?: string) {
    this.activeFlows.set(merchantPaymentId, {
      startTime: Date.now(),
      amount,
      tenantId,
      steps: ['payment_initiated']
    });

    PopPayLogger.payment.start(merchantPaymentId, amount, tenantId);
  }

  /**
   * 決済フローのステップを記録
   */
  static recordStep(merchantPaymentId: string, step: string, metadata?: any) {
    const flow = this.activeFlows.get(merchantPaymentId);
    if (flow) {
      flow.steps.push(step);

      PopPayLogger.info(`Payment flow step: ${step}`, {
        type: 'payment_flow_step',
        merchantPaymentId,
        step,
        stepNumber: flow.steps.length,
        elapsedTime: Date.now() - flow.startTime,
        ...metadata
      });
    }
  }

  /**
   * 決済フローの完了を記録
   */
  static completeFlow(merchantPaymentId: string, finalStatus: 'COMPLETED' | 'FAILED' | 'CANCELLED', metadata?: any) {
    const flow = this.activeFlows.get(merchantPaymentId);
    if (flow) {
      const totalDuration = Date.now() - flow.startTime;
      flow.steps.push(`payment_${finalStatus.toLowerCase()}`);

      PopPayLogger.info('Payment flow completed', {
        type: 'payment_flow_completed',
        merchantPaymentId,
        finalStatus,
        totalDuration,
        totalSteps: flow.steps.length,
        flowSteps: flow.steps,
        amount: flow.amount,
        tenantId: flow.tenantId,
        ...metadata
      });

      // フローを完了したのでメモリから削除
      this.activeFlows.delete(merchantPaymentId);
    }
  }

  /**
   * アクティブなフロー数を取得
   */
  static getActiveFlowCount(): number {
    return this.activeFlows.size;
  }

  /**
   * 長時間実行されているフローを検出
   */
  static detectStaleFlows(thresholdMinutes: number = 30): string[] {
    const threshold = Date.now() - (thresholdMinutes * 60 * 1000);
    const staleFlows: string[] = [];

    for (const [merchantPaymentId, flow] of this.activeFlows.entries()) {
      if (flow.startTime < threshold) {
        staleFlows.push(merchantPaymentId);

        PopPayLogger.warn('Stale payment flow detected', {
          type: 'payment_flow_stale',
          merchantPaymentId,
          elapsedTime: Date.now() - flow.startTime,
          thresholdMinutes,
          steps: flow.steps,
          amount: flow.amount
        });
      }
    }

    return staleFlows;
  }
}

/**
 * セキュリティイベント分析ユーティリティ
 */
export class SecurityAnalyzer {
  private static suspiciousEvents = new Map<string, number>();

  /**
   * 疑わしいアクティビティを記録
   */
  static recordSuspiciousActivity(source: string, eventType: string, details?: any) {
    const key = `${source}:${eventType}`;
    const count = (this.suspiciousEvents.get(key) || 0) + 1;
    this.suspiciousEvents.set(key, count);

    PopPayLogger.security.invalidRequest({
      type: 'invalid_request',
      source,
      riskLevel: count > 5 ? 'critical' : count > 3 ? 'high' : 'medium',
      details: {
        eventType,
        occurrenceCount: count,
        ...details
      }
    });

    // 閾値を超えた場合は特別な警告を記録
    if (count >= 5) {
      PopPayLogger.security.unauthorizedAccess({
        type: 'unauthorized_access',
        source,
        riskLevel: 'critical',
        details: {
          eventType,
          occurrenceCount: count,
          message: 'Multiple suspicious events detected from same source'
        }
      });
    }
  }

  /**
   * 疑わしいアクティビティの統計を取得
   */
  static getSuspiciousActivityStats(): Record<string, number> {
    return Object.fromEntries(this.suspiciousEvents.entries());
  }

  /**
   * セキュリティイベントをリセット
   */
  static resetSecurityEvents() {
    this.suspiciousEvents.clear();
  }
}

/**
 * パフォーマンス分析ユーティリティ
 */
export class PerformanceAnalyzer {
  private static operationStats = new Map<string, {
    totalCalls: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    failures: number;
  }>();

  /**
   * 操作のパフォーマンス統計を記録
   */
  static recordOperation(operation: string, duration: number, success: boolean) {
    const stats = this.operationStats.get(operation) || {
      totalCalls: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      failures: 0
    };

    stats.totalCalls++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    if (!success) {
      stats.failures++;
    }

    this.operationStats.set(operation, stats);

    // パフォーマンスが悪化している場合は警告
    const avgDuration = stats.totalDuration / stats.totalCalls;
    if (avgDuration > 5000) { // 5秒以上の平均実行時間
      PopPayLogger.warn('Performance degradation detected', {
        type: 'performance_warning',
        operation,
        averageDuration: avgDuration,
        maxDuration: stats.maxDuration,
        failureRate: (stats.failures / stats.totalCalls) * 100
      });
    }
  }

  /**
   * パフォーマンス統計を取得
   */
  static getPerformanceStats(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [operation, stats] of this.operationStats.entries()) {
      result[operation] = {
        totalCalls: stats.totalCalls,
        averageDuration: stats.totalDuration / stats.totalCalls,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
        maxDuration: stats.maxDuration,
        failureRate: (stats.failures / stats.totalCalls) * 100
      };
    }

    return result;
  }

  /**
   * パフォーマンス統計をリセット
   */
  static resetStats() {
    this.operationStats.clear();
  }
}

/**
 * PayPay API分析ユーティリティ
 */
export class PayPayAPIAnalyzer {
  private static apiCalls = new Map<string, {
    successCount: number;
    errorCount: number;
    totalDuration: number;
    lastError?: any;
    lastErrorTime?: number;
  }>();

  /**
   * PayPay API呼び出し結果を記録
   */
  static recordAPICall(method: string, duration: number, success: boolean, error?: any) {
    const stats = this.apiCalls.get(method) || {
      successCount: 0,
      errorCount: 0,
      totalDuration: 0
    };

    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
      stats.lastError = error;
      stats.lastErrorTime = Date.now();
    }

    stats.totalDuration += duration;
    this.apiCalls.set(method, stats);

    // エラー率が高い場合は警告
    const totalCalls = stats.successCount + stats.errorCount;
    const errorRate = (stats.errorCount / totalCalls) * 100;

    if (errorRate > 10 && totalCalls >= 5) { // 10%以上のエラー率で5回以上の呼び出し
      PopPayLogger.warn('High PayPay API error rate detected', {
        type: 'paypay_api_warning',
        method,
        errorRate,
        totalCalls,
        recentErrors: stats.errorCount,
        averageDuration: stats.totalDuration / totalCalls
      });
    }
  }

  /**
   * PayPay API統計を取得
   */
  static getAPIStats(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [method, stats] of this.apiCalls.entries()) {
      const totalCalls = stats.successCount + stats.errorCount;
      result[method] = {
        totalCalls,
        successCount: stats.successCount,
        errorCount: stats.errorCount,
        successRate: (stats.successCount / totalCalls) * 100,
        averageDuration: stats.totalDuration / totalCalls,
        lastError: stats.lastError,
        lastErrorTime: stats.lastErrorTime
      };
    }

    return result;
  }
}

/**
 * ログ分析の包括的なレポート生成
 */
export class LogReporter {
  /**
   * システム全体のヘルスレポートを生成
   */
  static generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      activePaymentFlows: PaymentFlowAnalyzer.getActiveFlowCount(),
      staleFlows: PaymentFlowAnalyzer.detectStaleFlows(),
      performanceStats: PerformanceAnalyzer.getPerformanceStats(),
      paypayAPIStats: PayPayAPIAnalyzer.getAPIStats(),
      securityEvents: SecurityAnalyzer.getSuspiciousActivityStats(),
    };

    PopPayLogger.info('System health report generated', {
      type: 'health_report',
      report
    });

    return report;
  }

  /**
   * 決済関連の日次レポートを生成
   */
  static generateDailyPaymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      activeFlows: PaymentFlowAnalyzer.getActiveFlowCount(),
      performanceMetrics: PerformanceAnalyzer.getPerformanceStats(),
      apiMetrics: PayPayAPIAnalyzer.getAPIStats(),
    };

    PopPayLogger.info('Daily payment report generated', {
      type: 'daily_payment_report',
      report
    });

    return report;
  }
}

export {
  PaymentFlowAnalyzer,
  SecurityAnalyzer,
  PerformanceAnalyzer,
  PayPayAPIAnalyzer,
  LogReporter
};