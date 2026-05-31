import { NextRequest, NextResponse } from 'next/server'
// TODO: Implement payment status checking
// This will be implemented in Phase 1-5: 決済状況確認機能（ポーリング）

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantPaymentId: string }> }
) {
  try {
    const { merchantPaymentId } = await params

    if (!merchantPaymentId) {
      return NextResponse.json(
        { error: 'Missing merchantPaymentId' },
        { status: 400 }
      )
    }

    // TODO: Implement payment status check
    // 1. Call PayPay getPaymentDetails API
    // 2. Update transaction status in Supabase
    // 3. Return current status

    return NextResponse.json(
      { error: 'Payment status check not yet implemented' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}