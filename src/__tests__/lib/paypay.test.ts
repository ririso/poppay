import { PayPayService } from '@/lib/paypay'
import { TransactionStatus } from '@/types/database'

// Mock PayPay SDK
jest.mock('@paypayopa/paypayopa-sdk-node')

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}))

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-merchant-payment-id'),
}))

describe('PayPayService', () => {
  const mockSupabaseClient = {
    from: jest.fn(() => ({
      insert: jest.fn(),
      update: jest.fn(),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      eq: jest.fn(),
    })),
  }

  const mockPayPaySDK = require('@paypayopa/paypayopa-sdk-node')

  beforeEach(() => {
    jest.clearAllMocks()
    require('@/lib/supabase').createSupabaseAdmin.mockReturnValue(mockSupabaseClient)
  })

  describe('createQRCode', () => {
    const validRequest = {
      amount: 1000,
      description: 'Test payment',
    }

    it('should create QR code and transaction record successfully', async () => {
      // Setup mocks
      mockSupabaseClient.from().insert.mockReturnValue({ error: null })
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          codeId: 'test-code-id',
          url: 'paypay://payment?code=test',
          deeplink: 'paypay://test',
          expiryDate: 1234567890,
          merchantPaymentId: 'test-merchant-payment-id',
          amount: { amount: 1000, currency: 'JPY' },
          orderDescription: 'Test payment',
          codeType: 'ORDER_QR',
        },
      }

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse)

      // Execute
      const result = await PayPayService.createQRCode(validRequest)

      // Verify PayPay SDK call
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledWith({
        merchantPaymentId: 'test-merchant-payment-id',
        codeType: 'ORDER_QR',
        amount: { amount: 1000, currency: 'JPY' },
        orderDescription: 'Test payment',
        isAuthorization: false,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        redirectType: 'WEB_LINK',
      })

      // Verify database operations
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        merchant_payment_id: 'test-merchant-payment-id',
        amount: 1000,
        description: 'Test payment',
        status: 'CREATED',
        tenant_id: '00000000-0000-0000-0000-000000000001',
      })

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        paypay_code_id: 'test-code-id',
      })

      // Verify response
      expect(result).toEqual({
        ...mockPayPayResponse,
        merchantPaymentId: 'test-merchant-payment-id',
      })
    })

    it('should create QR code with custom tenant ID', async () => {
      const requestWithTenant = {
        ...validRequest,
        tenantId: 'custom-tenant-id',
      }

      mockSupabaseClient.from().insert.mockReturnValue({ error: null })
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: { codeId: 'test-code-id', url: 'paypay://test' },
      }

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse)

      await PayPayService.createQRCode(requestWithTenant)

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'custom-tenant-id',
        })
      )
    })

    it('should handle database insert error gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockSupabaseClient.from().insert.mockReturnValue({ error: dbError })
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: { codeId: 'test-code-id', url: 'paypay://test' },
      }

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await PayPayService.createQRCode(validRequest)

      expect(consoleSpy).toHaveBeenCalledWith('Database insert error:', dbError)
      expect(result).toEqual(expect.objectContaining(mockPayPayResponse))

      consoleSpy.mockRestore()
    })

    it('should handle PayPay API error and update transaction status', async () => {
      mockSupabaseClient.from().insert.mockReturnValue({ error: null })
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const payPayError = new Error('PayPay API error')
      mockPayPaySDK.QRCodeCreate.mockRejectedValue(payPayError)

      await expect(PayPayService.createQRCode(validRequest)).rejects.toThrow(
        'Failed to create PayPay QR code'
      )

      // Should update transaction status to FAILED
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'FAILED',
      })
    })

    it('should handle update error after successful PayPay creation', async () => {
      mockSupabaseClient.from().insert.mockReturnValue({ error: null })

      const updateError = new Error('Update failed')
      mockSupabaseClient.from().update.mockReturnValue({ error: updateError })

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: { codeId: 'test-code-id', url: 'paypay://test' },
      }

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse)

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await PayPayService.createQRCode(validRequest)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update transaction with PayPay code ID:',
        updateError
      )
      expect(result).toEqual(expect.objectContaining(mockPayPayResponse))

      consoleSpy.mockRestore()
    })
  })

  describe('getPaymentDetails', () => {
    const merchantPaymentId = 'test-merchant-payment-id'

    it('should retrieve payment details and update transaction status', async () => {
      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'COMPLETED',
          acceptedAt: 1234567890,
          paymentId: 'pay-123',
          merchantPaymentId,
          amount: { amount: 1000, currency: 'JPY' },
          orderDescription: 'Test payment',
        },
      }

      mockPayPaySDK.GetPaymentDetails.mockResolvedValue(mockPayPayResponse)
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const result = await PayPayService.getPaymentDetails(merchantPaymentId)

      expect(mockPayPaySDK.GetPaymentDetails).toHaveBeenCalledWith(merchantPaymentId)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'COMPLETED',
        paid_at: new Date(1234567890 * 1000).toISOString(),
      })
      expect(result).toBe(mockPayPayResponse)
    })

    it('should map different PayPay statuses correctly', async () => {
      const statusMappings = [
        { paypayStatus: 'COMPLETED', dbStatus: 'COMPLETED' },
        { paypayStatus: 'FAILED', dbStatus: 'FAILED' },
        { paypayStatus: 'EXPIRED', dbStatus: 'EXPIRED' },
        { paypayStatus: 'CANCELED', dbStatus: 'FAILED' },
      ]

      for (const { paypayStatus, dbStatus } of statusMappings) {
        jest.clearAllMocks()

        const mockResponse = {
          resultInfo: { code: 'SUCCESS', message: 'Success' },
          data: { status: paypayStatus, merchantPaymentId },
        }

        mockPayPaySDK.GetPaymentDetails.mockResolvedValue(mockResponse)
        mockSupabaseClient.from().update.mockReturnValue({ error: null })

        await PayPayService.getPaymentDetails(merchantPaymentId)

        expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
          expect.objectContaining({ status: dbStatus })
        )
      }
    })

    it('should handle PayPay API error', async () => {
      const apiError = new Error('PayPay API error')
      mockPayPaySDK.GetPaymentDetails.mockRejectedValue(apiError)

      await expect(PayPayService.getPaymentDetails(merchantPaymentId)).rejects.toThrow(
        'Failed to get payment details'
      )
    })

    it('should handle database update error gracefully', async () => {
      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: { status: 'COMPLETED', merchantPaymentId },
      }

      mockPayPaySDK.GetPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const updateError = new Error('Database update failed')
      mockSupabaseClient.from().update.mockReturnValue({ error: updateError })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await PayPayService.getPaymentDetails(merchantPaymentId)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update transaction status:',
        updateError
      )
      expect(result).toBe(mockPayPayResponse)

      consoleSpy.mockRestore()
    })
  })

  describe('cancelPayment', () => {
    const merchantPaymentId = 'test-merchant-payment-id'

    it('should cancel payment and update transaction status', async () => {
      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: { merchantPaymentId },
      }

      mockPayPaySDK.CancelPayment.mockResolvedValue(mockPayPayResponse)
      mockSupabaseClient.from().update.mockReturnValue({ error: null })

      const result = await PayPayService.cancelPayment(merchantPaymentId)

      expect(mockPayPaySDK.CancelPayment).toHaveBeenCalledWith(merchantPaymentId)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'FAILED',
      })
      expect(result).toBe(mockPayPayResponse)
    })

    it('should handle PayPay API error', async () => {
      const apiError = new Error('Cancel failed')
      mockPayPaySDK.CancelPayment.mockRejectedValue(apiError)

      await expect(PayPayService.cancelPayment(merchantPaymentId)).rejects.toThrow(
        'Failed to cancel payment'
      )
    })
  })

  describe('getTransaction', () => {
    const merchantPaymentId = 'test-merchant-payment-id'

    it('should retrieve transaction from database successfully', async () => {
      const mockTransaction = {
        id: 'trans-123',
        merchant_payment_id: merchantPaymentId,
        amount: 1000,
        description: 'Test payment',
        status: 'COMPLETED',
      }

      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: mockTransaction,
        error: null,
      })

      const result = await PayPayService.getTransaction(merchantPaymentId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith('*')
      expect(result).toBe(mockTransaction)
    })

    it('should return null when transaction not found', async () => {
      const dbError = { code: 'PGRST116', message: 'No rows found' }
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: null,
        error: dbError,
      })

      const result = await PayPayService.getTransaction(merchantPaymentId)

      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockSupabaseClient.from().select().eq().single.mockImplementation(() => {
        throw dbError
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await PayPayService.getTransaction(merchantPaymentId)

      expect(consoleSpy).toHaveBeenCalledWith('Database operation failed:', dbError)
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })
  })
})
