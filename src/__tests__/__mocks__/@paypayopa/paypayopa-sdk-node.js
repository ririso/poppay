// Mock for PayPay SDK
const mockPayPaySDK = {
  Configure: jest.fn(),
  QRCodeCreate: jest.fn(),
  GetPaymentDetails: jest.fn(),
  CancelPayment: jest.fn(),
}

module.exports = mockPayPaySDK
