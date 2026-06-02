import { TransactionStatus } from './database'

export interface Transaction {
  id: string
  tenant_id?: string
  merchant_payment_id: string
  amount: number
  description?: string
  status: TransactionStatus
  paypay_code_id?: string
  created_at: string
  paid_at?: string
}

export interface CreateQRRequest {
  amount: number
  description?: string
}

export interface CreateQRResponse {
  qrUrl: string
  merchantPaymentId: string
  codeId: string
}

export interface PaymentStatusResponse {
  status: TransactionStatus
  paidAt?: string
}