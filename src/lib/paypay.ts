import 'server-only';
import { v4 as uuidv4 } from 'uuid';
import { createSupabaseAdmin } from './supabase';
import { PayPayCreateQRRequest, PayPayCreateQRResponse, PayPayPaymentDetailsResponse, PayPayEnvironment } from '@/types/paypay';
import { DEFAULT_TENANT_ID, TransactionStatus } from '@/types/database';
import PopPayLogger, { PerformanceTimer } from './logger';
import { PaymentFlowAnalyzer, PayPayAPIAnalyzer, PerformanceAnalyzer } from './log-utils';

// PayPay SDK types and configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (id: string) => any;
const PAYPAY = require('@paypayopa/paypayopa-sdk-node') as {
  Configure: (config: { env: string; clientId?: string; clientSecret?: string }) => void;
  QRCodeCreate: (payload: PayPayCreateQRRequest) => Promise<PayPayCreateQRResponse>;
  GetPaymentDetails: (merchantPaymentId: string) => Promise<PayPayPaymentDetailsResponse>;
  CancelPayment: (merchantPaymentId: string) => Promise<PayPayPaymentDetailsResponse>;
};

// Configure PayPay SDK with enhanced configuration
const paypayConfig = {
  env: (process.env.PAYPAY_ENV as PayPayEnvironment) || 'STAGING',
  clientId: process.env.PAYPAY_CLIENT_ID || '',
  clientSecret: process.env.PAYPAY_CLIENT_SECRET || '',
};

// Validate configuration - fail fast in production
function validatePayPayConfiguration() {
  const missingVars = [];

  if (!paypayConfig.clientId) {
    missingVars.push('PAYPAY_CLIENT_ID');
  }

  if (!paypayConfig.clientSecret) {
    missingVars.push('PAYPAY_CLIENT_SECRET');
  }

  if (!process.env.PAYPAY_WEBHOOK_SECRET) {
    missingVars.push('PAYPAY_WEBHOOK_SECRET');
  }

  if (missingVars.length > 0) {
    const errorMessage = `PayPay configuration missing required environment variables: ${missingVars.join(', ')}`;

    if (process.env.NODE_ENV === 'production') {
      PopPayLogger.error(errorMessage, new Error(errorMessage), {
        missingVariables: missingVars,
        environment: process.env.NODE_ENV,
        configuredVariables: {
          hasClientId: !!paypayConfig.clientId,
          hasClientSecret: !!paypayConfig.clientSecret,
          hasWebhookSecret: !!process.env.PAYPAY_WEBHOOK_SECRET
        }
      });
      // Fail fast in production
      throw new Error(errorMessage);
    } else {
      // Development/test mode: warn but don't fail
      PopPayLogger.warn(errorMessage, {
        missingVariables: missingVars,
        environment: process.env.NODE_ENV
      });
    }
  }
}

validatePayPayConfiguration();

PAYPAY.Configure(paypayConfig);

export interface CreateQRCodeRequest {
  amount: number;
  description: string;
  tenantId?: string;
}

export class PayPayService {
  /**
   * トランザクション記録を作成
   */
  static async createTransaction(data: {
    merchantPaymentId: string;
    amount: number;
    description: string;
    tenantId?: string;
  }): Promise<{ success: true; merchantPaymentId: string }> {
    const timer = new PerformanceTimer('create_transaction');
    const supabase = createSupabaseAdmin();

    try {
      PopPayLogger.payment.start(data.merchantPaymentId, data.amount, data.tenantId);

      const { error } = await supabase
        .from('transactions')
        .insert({
          merchant_payment_id: data.merchantPaymentId,
          amount: data.amount,
          description: data.description,
          status: 'CREATED' as TransactionStatus,
          tenant_id: data.tenantId || DEFAULT_TENANT_ID,
        });

      if (error) {
        timer.end('failure', { error });
        PopPayLogger.database.query('insert', 'transactions', undefined, error);
        throw new Error('Failed to create transaction record');
      }

      const duration = timer.end('success');
      PopPayLogger.database.query('insert', 'transactions', duration);

      return { success: true, merchantPaymentId: data.merchantPaymentId };
    } catch (error) {
      PopPayLogger.error('Failed to create transaction', error, data);
      throw error;
    }
  }

  /**
   * PayPay QRコード生成
   */
  static async generatePayPayQR(data: {
    merchantPaymentId: string;
    amount: number;
    description: string;
  }): Promise<PayPayCreateQRResponse> {
    const timer = new PerformanceTimer('generate_paypay_qr');
    const payload: PayPayCreateQRRequest = {
      merchantPaymentId: data.merchantPaymentId,
      codeType: 'ORDER_QR',
      amount: {
        amount: data.amount,
        currency: 'JPY',
      },
      orderDescription: data.description,
      isAuthorization: false,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      redirectType: 'WEB_LINK',
    };

    try {
      PopPayLogger.paypay.apiCall('QRCodeCreate', data.merchantPaymentId);

      const response = await PAYPAY.QRCodeCreate(payload);

      const duration = timer.end('success');
      PopPayLogger.paypay.apiSuccess('QRCodeCreate', duration, data.merchantPaymentId, response);

      // PayPay API分析に記録
      PayPayAPIAnalyzer.recordAPICall('QRCodeCreate', duration, true);

      PopPayLogger.payment.qrGenerated({
        merchantPaymentId: data.merchantPaymentId,
        amount: data.amount,
        codeId: response.data?.codeId
      });

      return response;
    } catch (error) {
      const duration = timer.end('failure', { error });
      PopPayLogger.paypay.apiError('QRCodeCreate', error, data.merchantPaymentId, duration);

      // PayPay API分析に失敗を記録
      PayPayAPIAnalyzer.recordAPICall('QRCodeCreate', duration, false, error);

      throw new Error('Failed to create PayPay QR code');
    }
  }

  /**
   * PayPayデータでトランザクション更新
   */
  static async updateTransactionWithPayPay(data: {
    merchantPaymentId: string;
    payPayCodeId: string;
    status?: 'COMPLETED' | 'FAILED';
    paidAt?: string;
  }): Promise<{ success: true }> {
    const timer = new PerformanceTimer('update_transaction_with_paypay');
    const supabase = createSupabaseAdmin();

    try {
      const updateData: {
        paypay_code_id: string;
        status?: 'COMPLETED' | 'FAILED';
        paid_at?: string;
      } = {
        paypay_code_id: data.payPayCodeId,
      };

      if (data.status) {
        updateData.status = data.status;
      }

      if (data.paidAt) {
        updateData.paid_at = data.paidAt;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('merchant_payment_id', data.merchantPaymentId);

      if (error) {
        timer.end('failure', { error });
        PopPayLogger.database.query('update', 'transactions', undefined, error);
        throw new Error('Failed to update transaction with PayPay data');
      }

      const duration = timer.end('success');
      PopPayLogger.database.query('update', 'transactions', duration);

      // ステータス変更をログに記録
      if (data.status === 'COMPLETED') {
        PopPayLogger.payment.completed({
          merchantPaymentId: data.merchantPaymentId,
          codeId: data.payPayCodeId,
          status: data.status
        });
      } else if (data.status === 'FAILED') {
        PopPayLogger.payment.failed({
          merchantPaymentId: data.merchantPaymentId,
          codeId: data.payPayCodeId,
          status: data.status
        });
      }

      return { success: true };
    } catch (error) {
      PopPayLogger.error('Failed to update transaction with PayPay data', error, data);
      throw error;
    }
  }

  /**
   * リファクタリング後のQRコード作成（統合メソッド）
   */
  static async createQRCode({ amount, description, tenantId }: CreateQRCodeRequest): Promise<PayPayCreateQRResponse & { merchantPaymentId: string }> {
    const merchantPaymentId = uuidv4();
    const flowTimer = new PerformanceTimer('create_qr_code_full_flow');

    // 決済フロー分析を開始
    PaymentFlowAnalyzer.startFlow(merchantPaymentId, amount, tenantId);

    try {
      // Step 1: Create transaction
      PaymentFlowAnalyzer.recordStep(merchantPaymentId, 'database_transaction_create');
      await PayPayService.createTransaction({
        merchantPaymentId,
        amount,
        description,
        tenantId,
      });

      // Step 2: Generate PayPay QR
      PaymentFlowAnalyzer.recordStep(merchantPaymentId, 'paypay_qr_generation');
      const payPayResponse = await PayPayService.generatePayPayQR({
        merchantPaymentId,
        amount,
        description,
      });

      // Step 3: Update transaction with PayPay data
      PaymentFlowAnalyzer.recordStep(merchantPaymentId, 'database_transaction_update');
      await PayPayService.updateTransactionWithPayPay({
        merchantPaymentId,
        payPayCodeId: payPayResponse.data?.codeId || '',
      });

      const duration = flowTimer.end('success');

      // パフォーマンス分析に記録
      PerformanceAnalyzer.recordOperation('create_qr_code_full_flow', duration, true);

      // 決済フロー完了を記録
      PaymentFlowAnalyzer.completeFlow(merchantPaymentId, 'COMPLETED', {
        codeId: payPayResponse.data?.codeId,
        totalDuration: duration
      });

      return {
        ...payPayResponse,
        merchantPaymentId,
      };
    } catch (error) {
      const duration = flowTimer.end('failure', { error });

      // パフォーマンス分析に失敗を記録
      PerformanceAnalyzer.recordOperation('create_qr_code_full_flow', duration, false);

      // 決済フロー失敗を記録
      PaymentFlowAnalyzer.completeFlow(merchantPaymentId, 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDuration: duration
      });

      // On error, attempt to update transaction status to FAILED
      try {
        PaymentFlowAnalyzer.recordStep(merchantPaymentId, 'error_recovery');
        await PayPayService.updateTransactionWithPayPay({
          merchantPaymentId,
          payPayCodeId: '',
          status: 'FAILED',
        });
      } catch (updateError) {
        PopPayLogger.warn('Failed to update failed transaction status', { updateError, merchantPaymentId });
      }
      throw error;
    }
  }

  static async getPaymentDetails(merchantPaymentId: string): Promise<PayPayPaymentDetailsResponse> {
    const timer = new PerformanceTimer('get_payment_details');

    try {
      PopPayLogger.paypay.apiCall('GetPaymentDetails', merchantPaymentId);
      const response = await PAYPAY.GetPaymentDetails(merchantPaymentId);

      const duration = timer.end('success');
      PopPayLogger.paypay.apiSuccess('GetPaymentDetails', duration, merchantPaymentId, response);

      // PayPay API分析に記録
      PayPayAPIAnalyzer.recordAPICall('GetPaymentDetails', duration, true);

      // Update transaction status in database based on PayPay response
      if (response.resultInfo.code === 'SUCCESS' && response.data?.status) {
        const supabase = createSupabaseAdmin();

        const statusMapping: Record<string, TransactionStatus> = {
          'COMPLETED': 'COMPLETED',
          'FAILED': 'FAILED',
          'EXPIRED': 'EXPIRED',
          'CANCELED': 'FAILED',
        };

        const dbStatus = statusMapping[response.data.status] || 'CREATED';

        try {
          const updateData: {
            status: TransactionStatus;
            paid_at?: string;
          } = { status: dbStatus };

          if (dbStatus === 'COMPLETED' && response.data.acceptedAt) {
            updateData.paid_at = new Date(response.data.acceptedAt * 1000).toISOString();
          }

          await supabase
            .from('transactions')
            .update(updateData)
            .eq('merchant_payment_id', merchantPaymentId);

          PopPayLogger.database.query('update', 'transactions');
        } catch (updateError) {
          PopPayLogger.warn('Failed to update transaction status', { updateError, merchantPaymentId });
        }
      }

      return response;
    } catch (error) {
      const duration = timer.end('failure', { error });
      PopPayLogger.paypay.apiError('GetPaymentDetails', error, merchantPaymentId, duration);

      // PayPay API分析に失敗を記録
      PayPayAPIAnalyzer.recordAPICall('GetPaymentDetails', duration, false, error);

      throw new Error('Failed to get payment details');
    }
  }

  static async cancelPayment(merchantPaymentId: string): Promise<PayPayPaymentDetailsResponse> {
    const timer = new PerformanceTimer('cancel_payment');

    try {
      PopPayLogger.paypay.apiCall('CancelPayment', merchantPaymentId);
      const response = await PAYPAY.CancelPayment(merchantPaymentId);

      const duration = timer.end('success');
      PopPayLogger.paypay.apiSuccess('CancelPayment', duration, merchantPaymentId, response);

      // PayPay API分析に記録
      PayPayAPIAnalyzer.recordAPICall('CancelPayment', duration, true);

      // Update transaction status to FAILED in database
      if (response.resultInfo.code === 'SUCCESS') {
        const supabase = createSupabaseAdmin();

        try {
          await supabase
            .from('transactions')
            .update({
              status: 'FAILED' as TransactionStatus,
            })
            .eq('merchant_payment_id', merchantPaymentId);

          PopPayLogger.payment.cancelled({ merchantPaymentId });
          PopPayLogger.database.query('update', 'transactions');
        } catch (updateError) {
          PopPayLogger.warn('Failed to update cancelled transaction status', { updateError, merchantPaymentId });
        }
      }

      return response;
    } catch (error) {
      const duration = timer.end('failure', { error });
      PopPayLogger.paypay.apiError('CancelPayment', error, merchantPaymentId, duration);

      // PayPay API分析に失敗を記録
      PayPayAPIAnalyzer.recordAPICall('CancelPayment', duration, false, error);

      throw new Error('Failed to cancel payment');
    }
  }

  // Get transaction from database
  static async getTransaction(merchantPaymentId: string) {
    const supabase = createSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_payment_id', merchantPaymentId)
        .single();

      if (error) {
        PopPayLogger.database.query('select', 'transactions', undefined, error);
        return null;
      }

      return data;
    } catch (error) {
      PopPayLogger.error('Database operation failed', error, { merchantPaymentId });
      return null;
    }
  }
}