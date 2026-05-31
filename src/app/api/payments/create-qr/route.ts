import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { PayPayService } from '@/lib/paypay';
import { createPaymentSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, description } = validation.data;

    // Create QR code with PayPay
    const paypayResponse = await PayPayService.createQRCode({
      amount,
      description,
    });

    // Check if PayPay response was successful
    if (paypayResponse.resultInfo.code !== 'SUCCESS') {
      console.error('PayPay error:', paypayResponse.resultInfo);
      return NextResponse.json(
        { error: 'PayPay QRコード生成に失敗しました' },
        { status: 500 }
      );
    }

    // Generate QR code image
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

    return NextResponse.json({
      success: true,
      merchantPaymentId: paypayResponse.data.merchantPaymentId,
      qrCode: qrCodeImage,
      codeUrl: qrCodeData,
      amount,
      description,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'QRコード生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}