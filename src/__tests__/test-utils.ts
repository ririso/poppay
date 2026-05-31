import { PayPayCreateQRResponse } from '@/types/paypay'
import { TransactionRow } from '@/types/database'

// Test data factories for TDD
export const createMockTransaction = (overrides: Partial<TransactionRow> = {}): TransactionRow => ({
  id: 'test-transaction-id',
  tenant_id: '00000000-0000-0000-0000-000000000001',
  merchant_payment_id: 'test-merchant-payment-id',
  amount: 1000,
  description: 'Test payment',
  status: 'CREATED',
  paypay_code_id: null,
  created_at: '2023-12-01T10:30:00.000Z',
  paid_at: null,
  ...overrides,
})

export const createMockPayPayResponse = (overrides: Partial<PayPayCreateQRResponse> = {}): PayPayCreateQRResponse => ({
  resultInfo: {
    code: 'SUCCESS',
    message: 'Success',
    codeId: 'test-code-id',
  },
  data: {
    codeId: 'test-code-id',
    url: 'paypay://payment?code=test',
    deeplink: 'paypay://test',
    expiryDate: 1234567890,
    merchantPaymentId: 'test-merchant-payment-id',
    amount: {
      amount: 1000,
      currency: 'JPY',
    },
    orderDescription: 'Test payment',
    codeType: 'ORDER_QR',
  },
  ...overrides,
})

export const createMockSupabaseClient = () => {
  const mockQuery = {
    insert: jest.fn().mockReturnValue({ error: null, data: null }),
    update: jest.fn().mockReturnValue({ error: null, data: null }),
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue({ error: null, data: null }),
      }),
    }),
    eq: jest.fn(),
    single: jest.fn(),
  }

  return {
    from: jest.fn(() => mockQuery),
  }
}

export const createMockPayPaySDK = () => ({
  Configure: jest.fn(),
  QRCodeCreate: jest.fn(),
  GetPaymentDetails: jest.fn(),
  CancelPayment: jest.fn(),
})

// Test helper functions
export const expectValidationError = (result: any, message: string) => {
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.errors[0].message).toBe(message)
  }
}

export const expectValidationSuccess = (result: any, expectedData: any) => {
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).toEqual(expectedData)
  }
}

// Mock UUID generator for consistent testing
export const MOCK_UUID = 'test-uuid-1234-5678-9012-345678901234'

// Common test scenarios
export const VALID_PAYMENT_REQUEST = {
  amount: 1000,
  description: 'Test payment',
}

export const INVALID_PAYMENT_REQUESTS = {
  MISSING_AMOUNT: { description: 'Test payment' },
  ZERO_AMOUNT: { amount: 0, description: 'Test payment' },
  NEGATIVE_AMOUNT: { amount: -100, description: 'Test payment' },
  OVER_LIMIT_AMOUNT: { amount: 1000001, description: 'Test payment' },
  MISSING_DESCRIPTION: { amount: 1000 },
  EMPTY_DESCRIPTION: { amount: 1000, description: '' },
  LONG_DESCRIPTION: { amount: 1000, description: 'a'.repeat(257) },
}

export const VALID_MERCHANT_PAYMENT_IDS = [
  '12345678-1234-1234-1234-123456789012',
  'abcdef01-2345-6789-abcd-ef0123456789',
  'FEDCBA98-7654-3210-FEDC-BA9876543210',
]

export const INVALID_MERCHANT_PAYMENT_IDS = [
  'not-a-uuid',
  '12345678-1234-1234-1234',
  '12345678-1234-1234-1234-123456789012-extra',
  '12345678_1234_1234_1234_123456789012',
  '',
  null,
  undefined,
]

// TDD assertion helpers
export const assertSuccessResponse = (response: Response, expectedData: any) => {
  expect(response.status).toBe(200)
  return response.json().then(data => {
    expect(data.success).toBe(true)
    Object.keys(expectedData).forEach(key => {
      expect(data[key]).toEqual(expectedData[key])
    })
  })
}

export const assertErrorResponse = (response: Response, expectedStatus: number, expectedMessage: string) => {
  expect(response.status).toBe(expectedStatus)
  return response.json().then(data => {
    expect(data.error).toBe(expectedMessage)
  })
}
