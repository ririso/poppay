import { NextRequest, NextResponse } from 'next/server'
// TODO: Implement PayPay QR code generation
// This will be implemented in Phase 1-3: PayPay QRコード生成機能実装

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { amount, description } = body

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // TODO: Implement PayPay SDK integration
    // 1. Generate unique merchant_payment_id
    // 2. Call PayPay createQRCode API
    // 3. Generate QR code image from URL
    // 4. Save transaction to Supabase
    // 5. Return QR URL and transaction info

    return NextResponse.json(
      { error: 'PayPay integration not yet implemented' },
      { status: 501 }
    )
  } catch (error) {
    console.error('QR creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}