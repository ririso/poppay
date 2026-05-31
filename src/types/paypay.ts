// PayPay OPA (Open Payment API) 関連の型定義
// 開発指針 4.決済フロー に基づく型定義

// PayPay SDK Configuration
export interface PayPayConfig {
  apiKey: string
  apiSecret: string
  merchantId: string
  productionMode: boolean
  baseUrl?: string
}

// QRコード生成リクエスト（開発指針 4-1. QRコード生成）
export interface PayPayCreateQRRequest {
  merchantPaymentId: string
  codeType: 'ORDER_QR'
  amount: {
    amount: number
    currency: 'JPY'
  }
  orderDescription?: string
  isAuthorization?: boolean
  redirectUrl?: string
  redirectType?: 'WEB_LINK'
  userAgent?: string
  storeInfo?: {
    storeId?: string
    storeName?: string
  }
}

// PayPay QRコード生成レスポンス
export interface PayPayCreateQRResponse {
  resultInfo: {
    code: string
    message: string
    codeId: string
  }
  data: {
    codeId: string
    url: string
    deeplink: string
    expiryDate: number
    merchantPaymentId: string
    amount: {
      amount: number
      currency: string
    }
    orderDescription: string
    codeType: string
  }
}

// 決済詳細取得レスポンス（開発指針 4-2. 支払い完了の検知）
export interface PayPayPaymentDetailsResponse {
  resultInfo: {
    code: string
    message: string
  }
  data: {
    paymentId: string
    status: PayPayPaymentStatus
    acceptedAt: number
    refunds?: {
      paymentId: string
      status: string
      acceptedAt: number
      merchantRefundId: string
      amount: {
        amount: number
        currency: string
      }
      requestedAt: number
    }[]
    captures?: {
      acceptedAt: number
      merchantCaptureId: string
      amount: {
        amount: number
        currency: string
      }
      orderDescription: string
      requestedAt: number
      expiresAt: number
      status: string
    }[]
    merchantPaymentId: string
    amount: {
      amount: number
      currency: string
    }
    orderDescription: string
  }
}

// PayPay決済ステータス
export type PayPayPaymentStatus =
  | 'CREATED'      // 作成済み
  | 'COMPLETED'    // 完了
  | 'FAILED'       // 失敗
  | 'EXPIRED'      // 期限切れ
  | 'CANCELED'     // キャンセル

// Webhookペイロード（開発指針：Webhook受信）
export interface PayPayWebhookPayload {
  eventType: 'payment.status.changed'
  eventDate: string
  data: {
    merchantPaymentId: string
    paymentId: string
    status: PayPayPaymentStatus
    acceptedAt?: number
    amount: {
      amount: number
      currency: string
    }
  }
}

// エラーレスポンス
export interface PayPayErrorResponse {
  resultInfo: {
    code: string
    message: string
  }
}

// PayPay環境設定（開発指針 5.環境構成）
export const PAYPAY_ENDPOINTS = {
  SANDBOX: 'https://stg-api.sandbox.paypay.ne.jp/',
  STAGING: 'https://stg-api.paypay.ne.jp/',
  PRODUCTION: 'https://api.paypay.ne.jp/'
} as const

export type PayPayEnvironment = keyof typeof PAYPAY_ENDPOINTS