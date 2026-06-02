import 'server-only';
import { v4 as uuidv4 } from 'uuid';
import { createSupabaseAdmin } from './supabase';
import { PayPayCreateQRRequest, PayPayCreateQRResponse, PayPayPaymentDetailsResponse, PayPayEnvironment } from '@/types/paypay';
import { DEFAULT_TENANT_ID, TransactionStatus } from '@/types/database';

// PayPay SDK types and configuration
declare const require: any;
const PAYPAY = require('@paypayopa/paypayopa-sdk-node');

// Configure PayPay SDK with enhanced configuration
const paypayConfig = {
  env: (process.env.PAYPAY_ENV as PayPayEnvironment) || 'STAGING',
  clientId: process.env.PAYPAY_CLIENT_ID,
  clientSecret: process.env.PAYPAY_CLIENT_SECRET,
};

// Validate configuration
if (!paypayConfig.clientId || !paypayConfig.clientSecret) {
  console.warn('PayPay configuration missing. Make sure PAYPAY_CLIENT_ID and PAYPAY_CLIENT_SECRET are set.');
}

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
    const supabase = createSupabaseAdmin();

    try {
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
        throw new Error('Failed to create transaction record');
      }

      return { success: true, merchantPaymentId: data.merchantPaymentId };
    } catch (error) {
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
      const response = await PAYPAY.QRCodeCreate(payload);
      return response;
    } catch (error) {
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
    const supabase = createSupabaseAdmin();

    try {
      const updateData: any = {
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
        throw new Error('Failed to update transaction with PayPay data');
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * リファクタリング後のQRコード作成（統合メソッド）
   */
  static async createQRCode({ amount, description, tenantId }: CreateQRCodeRequest): Promise<PayPayCreateQRResponse & { merchantPaymentId: string }> {
    const merchantPaymentId = uuidv4();

    try {
      // Step 1: Create transaction
      await PayPayService.createTransaction({
        merchantPaymentId,
        amount,
        description,
        tenantId,
      });

      // Step 2: Generate PayPay QR
      const payPayResponse = await PayPayService.generatePayPayQR({
        merchantPaymentId,
        amount,
        description,
      });

      // Step 3: Update transaction with PayPay data
      await PayPayService.updateTransactionWithPayPay({
        merchantPaymentId,
        payPayCodeId: payPayResponse.data?.codeId || '',
      });

      return {
        ...payPayResponse,
        merchantPaymentId,
      };
    } catch (error) {
      // On error, attempt to update transaction status to FAILED
      try {
        await PayPayService.updateTransactionWithPayPay({
          merchantPaymentId,
          payPayCodeId: '',
          status: 'FAILED',
        });
      } catch (updateError) {
        console.warn('Failed to update failed transaction status:', updateError);
      }
      throw error;
    }
  }

  static async getPaymentDetails(merchantPaymentId: string): Promise<PayPayPaymentDetailsResponse> {
    try {
      const response = await PAYPAY.GetPaymentDetails(merchantPaymentId);

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
          const updateData: any = { status: dbStatus };

          if (dbStatus === 'COMPLETED' && response.data.acceptedAt) {
            updateData.paid_at = new Date(response.data.acceptedAt * 1000).toISOString();
          }

          await supabase
            .from('transactions')
            .update(updateData)
            .eq('merchant_payment_id', merchantPaymentId);
        } catch (updateError) {
          console.warn('Failed to update transaction status:', updateError);
        }
      }

      return response;
    } catch (error) {
      console.error('PayPay payment details error:', error);
      throw new Error('Failed to get payment details');
    }
  }

  static async cancelPayment(merchantPaymentId: string): Promise<PayPayPaymentDetailsResponse> {
    try {
      const response = await PAYPAY.CancelPayment(merchantPaymentId);

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
        } catch (updateError) {
          console.warn('Failed to update cancelled transaction status:', updateError);
        }
      }

      return response;
    } catch (error) {
      console.error('PayPay cancel payment error:', error);
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
        console.error('Database query error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database operation failed:', error);
      return null;
    }
  }
}