import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { PayPayService } from '@/lib/paypay';
import { createPaymentSchema } from '@/lib/validations';
import { ApiErrorHandler } from '@/lib/error-handler';
import PopPayLogger, { PerformanceTimer } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestTimer = new PerformanceTimer('create_qr_request');
  const requestId = `create_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return ApiErrorHandler.handleApi(async () => {
    PopPayLogger.info('QR code creation request received', {
      requestId,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    });

    const body = await request.json();

    // Validate input
    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
      PopPayLogger.security.invalidRequest({
        type: 'data_validation',
        source: 'create_qr_api',
        riskLevel: 'low',
        details: {
          validationErrors: validation.error.errors,
          receivedPayload: body
        }
      });

      requestTimer.end('failure', { reason: 'validation_failed' });

      throw ApiErrorHandler.validationError(
        validation.error.errors[0]?.message || 'Validation failed',
        { zodErrors: validation.error.errors }
      );
    }

    const { amount, description } = validation.data;

    PopPayLogger.info('Creating QR code for payment', {
      requestId,
      amount,
      description: description.substring(0, 50) + '...' // Truncate for security
    });

    // Create QR code with PayPay
    const paypayResponse = await PayPayService.createQRCode({
      amount,
      description,
    });

    // Check if PayPay response was successful
    if (!ApiErrorHandler.isPayPaySuccess(paypayResponse)) {
      requestTimer.end('failure', { reason: 'paypay_error' });
      throw ApiErrorHandler.extractPayPayError(paypayResponse, 'QRコード生成');
    }

    // Generate QR code image
    const qrCodeTimer = new PerformanceTimer('qr_image_generation');
    const qrCodeData = paypayResponse.data.url;
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    });
    qrCodeTimer.end('success');

    const totalDuration = requestTimer.end('success');

    PopPayLogger.info('QR code created successfully', {
      requestId,
      merchantPaymentId: paypayResponse.merchantPaymentId,
      amount,
      duration: totalDuration,
      qrCodeSize: qrCodeImage.length
    });

    return {
      merchantPaymentId: paypayResponse.merchantPaymentId,
      qrCode: qrCodeImage,
      codeUrl: qrCodeData,
      amount,
      description,
    };
  }, '/api/payments/create-qr');
}