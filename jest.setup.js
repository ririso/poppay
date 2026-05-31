// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.PAYPAY_CLIENT_ID = 'test-paypay-client-id'
process.env.PAYPAY_CLIENT_SECRET = 'test-paypay-client-secret'
process.env.PAYPAY_ENV = 'STAGING'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to keep test output clean
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock UUID v4 for consistent testing
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9012-345678901234'),
}))

// Mock QRCode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockedQRCode')),
}))

// Mock PayPay SDK
jest.mock('@paypayopa/paypayopa-sdk-node', () => ({
  Configure: jest.fn(),
  QRCodeCreate: jest.fn(),
  GetPaymentDetails: jest.fn(),
  CancelPayment: jest.fn(),
}))

// Mock server-only module
jest.mock('server-only', () => {})
