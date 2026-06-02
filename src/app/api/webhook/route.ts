import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase';

/**
 * Webhook署名検証
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

/**
 * 決済ステータス更新
 */
async function updatePaymentStatus(merchantPaymentId: string, status: string, acceptedAt?: number): Promise<{ success: true; status: string }> {
  const supabase = createSupabaseAdmin();

  const statusMapping: Record<string, string> = {
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'EXPIRED': 'EXPIRED',
    'CANCELED': 'FAILED',
  };

  const dbStatus = statusMapping[status] || 'CREATED';

  const updateData: any = { status: dbStatus };

  if (dbStatus === 'COMPLETED' && acceptedAt) {
    updateData.paid_at = new Date(acceptedAt * 1000).toISOString();
  }

  const { error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('merchant_payment_id', merchantPaymentId);

  if (error) {
    throw new Error('Failed to update payment status');
  }

  return { success: true, status: dbStatus };
}

// PayPay webhook handler for payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-paypay-signature');
    const webhookSecret = process.env.PAYPAY_WEBHOOK_SECRET;

    // 1. 署名検証
    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    const isValidSignature = verifyWebhookSignature(
      JSON.stringify(body),
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 2. ペイロードの検証
    const { merchantPaymentId, status, acceptedAt } = body;

    if (!merchantPaymentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. データベース更新
    await updatePaymentStatus(
      merchantPaymentId,
      status,
      acceptedAt
    );

    // 4. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { error: 'Webhook処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}