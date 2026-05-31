import { NextRequest, NextResponse } from 'next/server'
// TODO: Implement PayPay webhook handler
// This will be implemented in Phase 2-1: Webhook実装（決済完了通知）

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement PayPay webhook handling
    // 1. Verify PayPay signature
    // 2. Parse webhook payload
    // 3. Update transaction status in Supabase
    // 4. Return 200 OK immediately (PayPay requirement: <2 seconds)

    // For now, return 200 OK to prevent PayPay retries
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent retries for now
    return NextResponse.json({ error: 'Webhook not implemented' }, { status: 200 })
  }
}