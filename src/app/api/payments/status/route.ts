import { NextRequest } from 'next/server';
import { PayPayService } from '@/lib/paypay';
import { merchantPaymentIdSchema } from '@/lib/validations';
import { ApiErrorHandler } from '@/lib/error-handler';
import { ErrorMessages } from '@/types/errors';
import PopPayLogger, { PerformanceTimer } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestTimer = new PerformanceTimer('payment_status_request');
  const requestId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return ApiErrorHandler.handleApi(async () => {
    const { searchParams } = new URL(request.url);
    const merchantPaymentId = searchParams.get('merchantPaymentId');

    PopPayLogger.info('Payment status request received', {
      requestId,
      merchantPaymentId,
      userAgent: request.headers.get('user-agent')
    });

    if (!merchantPaymentId) {
      PopPayLogger.security.invalidRequest({
        type: 'data_validation',
        source: 'payment_status_api',
        riskLevel: 'low',
        details: {
          missingField: 'merchantPaymentId',
          searchParams: Object.fromEntries(searchParams.entries())
        }
      });

      requestTimer.end('failure', { reason: 'missing_merchant_payment_id' });

      throw ApiErrorHandler.validationError(
        ErrorMessages.MISSING_REQUIRED_FIELD,
        { field: 'merchantPaymentId' }
      );
    }

    // Validate merchantPaymentId format
    const validation = merchantPaymentIdSchema.safeParse(merchantPaymentId);
    if (!validation.success) {
      PopPayLogger.security.invalidRequest({
        type: 'data_validation',
        source: 'payment_status_api',
        riskLevel: 'medium',
        details: {
          merchantPaymentId,
          validationErrors: validation.error.errors
        }
      });

      requestTimer.end('failure', { reason: 'invalid_merchant_payment_id_format' });

      throw ApiErrorHandler.validationError(
        ErrorMessages.INVALID_PAYMENT_ID,
        { zodErrors: validation.error.errors }
      );
    }

    PopPayLogger.info('Fetching payment details from PayPay', {
      requestId,
      merchantPaymentId
    });

    // Get payment details from PayPay
    const paypayResponse = await PayPayService.getPaymentDetails(merchantPaymentId);

    // Check if PayPay response was successful
    if (!ApiErrorHandler.isPayPaySuccess(paypayResponse)) {
      requestTimer.end('failure', { reason: 'paypay_error' });
      throw ApiErrorHandler.extractPayPayError(paypayResponse, '決済状況取得');
    }

    const paymentData = paypayResponse.data;
    const duration = requestTimer.end('success');

    PopPayLogger.info('Payment status retrieved successfully', {
      requestId,
      merchantPaymentId,
      status: paymentData.status,
      amount: paymentData.amount,
      duration
    });

    return {
      merchantPaymentId,
      status: paymentData.status,
      amount: paymentData.amount,
      orderDescription: paymentData.orderDescription,
      acceptedAt: paymentData.acceptedAt,
    };
  }, '/api/payments/status');
}