import 'server-only';
import { randomUUID } from 'crypto';

// PayPay SDK types and configuration
declare const require: any;
const PAYPAY = require('@paypayopa/paypayopa-sdk-node');

// Configure PayPay SDK
PAYPAY.Configure({
  env: process.env.PAYPAY_ENV || 'STAGING',
  clientId: process.env.PAYPAY_CLIENT_ID,
  clientSecret: process.env.PAYPAY_CLIENT_SECRET,
});

export interface CreateQRCodeRequest {
  amount: number;
  description: string;
}

export interface PayPayQRCodeResponse {
  merchantPaymentId: string;
  amount: {
    amount: number;
    currency: string;
  };
  codeType: string;
  orderDescription: string;
  redirectUrl?: string;
  redirectType?: string;
}

export interface PayPayResult {
  resultInfo: {
    code: string;
    message: string;
    codeId: string;
  };
  data?: any;
}

export class PayPayService {
  static async createQRCode({ amount, description }: CreateQRCodeRequest): Promise<PayPayResult> {
    const merchantPaymentId = randomUUID();

    const payload = {
      merchantPaymentId,
      amount: {
        amount,
        currency: 'JPY',
      },
      codeType: 'ORDER_QR',
      orderDescription: description,
      isAuthorization: false,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      redirectType: 'WEB_LINK',
    };

    try {
      const response = await PAYPAY.QRCodeCreate(payload);
      return response;
    } catch (error) {
      console.error('PayPay QR creation error:', error);
      throw new Error('Failed to create PayPay QR code');
    }
  }

  static async getPaymentDetails(merchantPaymentId: string): Promise<PayPayResult> {
    try {
      const response = await PAYPAY.GetPaymentDetails(merchantPaymentId);
      return response;
    } catch (error) {
      console.error('PayPay payment details error:', error);
      throw new Error('Failed to get payment details');
    }
  }

  static async cancelPayment(merchantPaymentId: string): Promise<PayPayResult> {
    try {
      const response = await PAYPAY.CancelPayment(merchantPaymentId);
      return response;
    } catch (error) {
      console.error('PayPay cancel payment error:', error);
      throw new Error('Failed to cancel payment');
    }
  }
}