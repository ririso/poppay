// PayPay関連のユーティリティ関数とSDK設定
// 開発指針 3.技術スタック、5.環境構成、6.セキュリティ方針 に準拠

import { v4 as uuidv4 } from 'uuid'
import { PayPayConfig, PAYPAY_ENDPOINTS, PayPayEnvironment } from '@/types/paypay'

// PayPay SDK設定（開発指針 5.環境構成に準拠）
export const PAYPAY_CONFIG: PayPayConfig = {
  apiKey: process.env.PAYPAY_API_KEY || '',
  apiSecret: process.env.PAYPAY_API_SECRET || '',
  merchantId: process.env.PAYPAY_MERCHANT_ID || '',
  productionMode: process.env.PAYPAY_PRODUCTION_MODE === 'true',
  baseUrl: process.env.PAYPAY_API_BASE_URL || PAYPAY_ENDPOINTS.SANDBOX
}

// 環境別エンドポイント取得（開発指針 5.環境構成）
export function getPayPayEndpoint(productionMode: boolean): string {
  if (productionMode) {
    return PAYPAY_ENDPOINTS.PRODUCTION
  }
  // 開発・テスト用はSandbox環境
  return PAYPAY_ENDPOINTS.SANDBOX
}

// PayPay設定検証（開発指針 6.セキュリティ方針）
export function validatePayPayConfig(): boolean {
  const { apiKey, apiSecret, merchantId } = PAYPAY_CONFIG

  if (!apiKey || !apiSecret || !merchantId) {
    throw new Error('PayPay configuration is incomplete. Please check environment variables.')
  }

  // APIキーの基本的なフォーマットチェック
  if (apiKey.length < 10 || apiSecret.length < 10) {
    throw new Error('PayPay API credentials appear to be invalid (too short)')
  }

  return true
}

// merchantPaymentId生成（開発指針 4-1. QRコード生成: 必ず毎回ユニークに採番）
export function generateMerchantPaymentId(): string {
  const timestamp = Date.now()
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8)
  return `poppay_${timestamp}_${uuid}`
}

// PayPay IPホワイトリストチェック（開発指針 6.セキュリティ方針）
export function isPayPayIP(clientIP: string): boolean {
  // PayPayからのWebhook送信元IPアドレス範囲
  // 実際の運用では PayPay から提供される正確な IP 範囲を使用する
  const paypayIPRanges = [
    // 例: PayPayのIPアドレス範囲（要確認）
    '203.104.153.0/24',
    '52.199.204.0/22',
    // 実際の範囲は PayPay のドキュメントで確認が必要
  ]

  // 開発環境ではIPチェックをスキップ（環境変数で制御）
  if (process.env.ENABLE_PAYPAY_IP_WHITELIST !== 'true') {
    return true
  }

  // 実装は簡略化：実際にはIPアドレス範囲の詳細チェックが必要
  return paypayIPRanges.some(range => {
    // 簡易実装：実際にはCIDR計算が必要
    return clientIP.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.'))
  })
}

// PayPay環境情報取得
export function getPayPayEnvironmentInfo() {
  const { productionMode } = PAYPAY_CONFIG

  return {
    environment: productionMode ? 'production' : 'sandbox' as PayPayEnvironment,
    endpoint: getPayPayEndpoint(productionMode),
    isProduction: productionMode,
    merchantId: PAYPAY_CONFIG.merchantId
  }
}

// ログ出力用の安全な設定表示（APIキー等は隠す）
export function getPayPayConfigSafe() {
  return {
    hasApiKey: !!PAYPAY_CONFIG.apiKey,
    hasApiSecret: !!PAYPAY_CONFIG.apiSecret,
    hasMerchantId: !!PAYPAY_CONFIG.merchantId,
    productionMode: PAYPAY_CONFIG.productionMode,
    baseUrl: PAYPAY_CONFIG.baseUrl
  }
}