import { NextRequest, NextResponse } from 'next/server';
import { PayPayService } from '@/lib/paypay';
import { merchantPaymentIdSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantPaymentId = searchParams.get('merchantPaymentId');

    if (!merchantPaymentId) {
      return NextResponse.json(
        { error: 'merchantPaymentIdが必要です' },
        { status: 400 }
      );
    }

    // Validate merchantPaymentId format
    const validation = merchantPaymentIdSchema.safeParse(merchantPaymentId);
    if (!validation.success) {
      return NextResponse.json(
        { error: '無効な決済IDです' },
        { status: 400 }
      );
    }

    // Get payment details from PayPay
    const paypayResponse = await PayPayService.getPaymentDetails(merchantPaymentId);

    // Check if PayPay response was successful
    if (paypayResponse.resultInfo.code !== 'SUCCESS') {
      console.error('PayPay error:', paypayResponse.resultInfo);
      return NextResponse.json(
        { error: 'PayPay決済状況の取得に失敗しました' },
        { status: 500 }
      );
    }

    const paymentData = paypayResponse.data;

    return NextResponse.json({
      success: true,
      merchantPaymentId,
      status: paymentData.status,
      amount: paymentData.amount,
      orderDescription: paymentData.orderDescription,
      acceptedAt: paymentData.acceptedAt,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '決済状況確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}