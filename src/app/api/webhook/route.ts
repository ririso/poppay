import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase';
import { ApiErrorHandler } from '@/lib/error-handler';
import { ErrorMessages } from '@/types/errors';
import PopPayLogger, { PerformanceTimer } from '@/lib/logger';

/**
 * Webhook署名検証
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const timer = new PerformanceTimer('webhook_signature_verification');

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(`sha256=${expectedSignature}`, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  const isValid = expectedBuffer.length === signatureBuffer.length &&
                  timingSafeEqual(expectedBuffer, signatureBuffer);

  timer.end(isValid ? 'success' : 'failure', {
    signatureProvided: !!signature,
    secretProvided: !!secret,
    payloadLength: payload.length
  });

  if (!isValid) {
    PopPayLogger.security.webhookVerificationFailed({
      type: 'webhook_signature',
      source: 'webhook_handler',
      riskLevel: 'high',
      details: {
        providedSignature: signature?.substring(0, 10) + '...',
        expectedPrefix: expectedSignature.substring(0, 10) + '...'
      }
    });
  }

  return isValid;
}

/**
 * 決済ステータス更新
 */
async function updatePaymentStatus(merchantPaymentId: string, status: string, acceptedAt?: number): Promise<{ success: true; status: string }> {
  const timer = new PerformanceTimer('update_payment_status_from_webhook');
  const supabase = createSupabaseAdmin();

  const statusMapping: Record<string, string> = {
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'EXPIRED': 'EXPIRED',
    'CANCELED': 'FAILED',
  };

  const dbStatus = statusMapping[status] || 'CREATED';

  const updateData: {
    status: string;
    paid_at?: string;
  } = { status: dbStatus };

  if (dbStatus === 'COMPLETED' && acceptedAt) {
    updateData.paid_at = new Date(acceptedAt * 1000).toISOString();
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('merchant_payment_id', merchantPaymentId);

    if (error) {
      timer.end('failure', { error, merchantPaymentId, status });
      PopPayLogger.database.query('update', 'transactions', undefined, error);

      throw ApiErrorHandler.transactionUpdateError({
        merchantPaymentId,
        supabaseError: error,
      });
    }

    const duration = timer.end('success');
    PopPayLogger.database.query('update', 'transactions', duration);

    // ステータス変更をログに記録
    if (dbStatus === 'COMPLETED') {
      PopPayLogger.payment.completed({
        merchantPaymentId,
        status: dbStatus,
        action: 'webhook_notification'
      });
    } else if (dbStatus === 'FAILED' || dbStatus === 'EXPIRED') {
      PopPayLogger.payment.failed({
        merchantPaymentId,
        status: dbStatus,
        action: 'webhook_notification'
      });
    }

    return { success: true, status: dbStatus };
  } catch (error) {
    PopPayLogger.error('Failed to update payment status from webhook', error, {
      merchantPaymentId,
      status,
      acceptedAt
    });
    throw error;
  }
}

// PayPay webhook handler for payment notifications
export async function POST(request: NextRequest) {
  const webhookTimer = new PerformanceTimer('webhook_processing');
  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return ApiErrorHandler.handleApi(async () => {
    PopPayLogger.info('Webhook request received', {
      webhookId,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    });

    // 環境変数の検証
    ApiErrorHandler.validateEnvironment(['PAYPAY_WEBHOOK_SECRET']);

    const body = await request.json();
    const signature = request.headers.get('x-paypay-signature');
    const webhookSecret = process.env.PAYPAY_WEBHOOK_SECRET!;

    // ペイロードの基本情報をログに記録
    PopPayLogger.payment.webhookReceived({
      merchantPaymentId: body.merchantPaymentId || 'unknown',
      status: body.status || 'unknown',
      action: 'webhook_payload_received'
    });

    // 1. 署名検証
    if (!signature) {
      PopPayLogger.security.invalidRequest({
        type: 'invalid_request',
        source: 'webhook_handler',
        riskLevel: 'medium',
        details: {
          hasSignature: false,
          hasWebhookSecret: !!webhookSecret
        }
      });

      webhookTimer.end('failure', { reason: 'missing_signature' });

      throw ApiErrorHandler.webhookError(
        ErrorMessages.WEBHOOK_SIGNATURE_INVALID,
        { reason: 'Missing signature header' }
      );
    }

    const isValidSignature = verifyWebhookSignature(
      JSON.stringify(body),
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      webhookTimer.end('failure', { reason: 'invalid_signature' });
      throw ApiErrorHandler.webhookSignatureError();
    }

    PopPayLogger.info('Webhook signature verified successfully', { webhookId });

    // 2. ペイロードの検証
    const { merchantPaymentId, status, acceptedAt } = body;

    if (!merchantPaymentId || !status) {
      PopPayLogger.security.invalidRequest({
        type: 'data_validation',
        source: 'webhook_handler',
        riskLevel: 'low',
        details: {
          hasMerchantPaymentId: !!merchantPaymentId,
          hasStatus: !!status,
          payloadKeys: Object.keys(body)
        }
      });

      webhookTimer.end('failure', { reason: 'missing_required_fields' });

      throw ApiErrorHandler.webhookPayloadError({
        missingFields: {
          merchantPaymentId: !merchantPaymentId,
          status: !status,
        },
        receivedPayload: body,
      });
    }

    // 3. データベース更新
    const result = await updatePaymentStatus(
      merchantPaymentId,
      status,
      acceptedAt
    );

    const duration = webhookTimer.end('success');

    PopPayLogger.info('Webhook processed successfully', {
      webhookId,
      merchantPaymentId,
      status,
      duration,
      resultStatus: result.status
    });

    // 4. 成功レスポンス
    return {
      message: 'Webhook processed successfully',
      merchantPaymentId,
      updatedStatus: result.status,
    };
  }, '/api/webhook');
}