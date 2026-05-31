import { GET } from '@/app/api/payments/status/route'
import { PayPayService } from '@/lib/paypay'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/paypay')

describe('/api/payments/status', () => {
  const mockPayPayService = PayPayService as jest.Mocked<typeof PayPayService>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createRequest = (merchantPaymentId?: string) => {
    const url = new URL('http://localhost:3000/api/payments/status')
    if (merchantPaymentId) {
      url.searchParams.set('merchantPaymentId', merchantPaymentId)
    }

    return new NextRequest(url.toString(), {
      method: 'GET',
    })
  }

  describe('successful payment status retrieval', () => {
    it('should return payment status with valid merchant payment ID', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'COMPLETED',
          amount: { amount: 1000, currency: 'JPY' },
          orderDescription: 'Test payment',
          acceptedAt: 1234567890,
          paymentId: 'pay-123',
          merchantPaymentId,
        },
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        merchantPaymentId,
        status: 'COMPLETED',
        amount: { amount: 1000, currency: 'JPY' },
        orderDescription: 'Test payment',
        acceptedAt: 1234567890,
      })

      expect(mockPayPayService.getPaymentDetails).toHaveBeenCalledWith(merchantPaymentId)
    })

    it('should return different payment statuses correctly', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'
      const statuses = ['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED']

      for (const status of statuses) {
        jest.clearAllMocks()

        const mockPayPayResponse = {
          resultInfo: { code: 'SUCCESS', message: 'Success' },
          data: {
            status,
            amount: { amount: 1000, currency: 'JPY' },
            orderDescription: 'Test payment',
            merchantPaymentId,
          },
        }

        mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

        const request = createRequest(merchantPaymentId)
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.status).toBe(status)
      }
    })
  })

  describe('input validation', () => {
    it('should reject request without merchantPaymentId parameter', async () => {
      const request = createRequest() // No merchantPaymentId

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('merchantPaymentIdが必要です')
      expect(mockPayPayService.getPaymentDetails).not.toHaveBeenCalled()
    })

    it('should reject request with invalid merchantPaymentId format', async () => {
      const invalidMerchantPaymentId = 'not-a-valid-uuid'

      const request = createRequest(invalidMerchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('無効な決済IDです')
      expect(mockPayPayService.getPaymentDetails).not.toHaveBeenCalled()
    })

    it('should accept valid UUID format', async () => {
      const validUUID = '12345678-1234-1234-1234-123456789012'

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'CREATED',
          merchantPaymentId: validUUID,
        },
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(validUUID)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPayPayService.getPaymentDetails).toHaveBeenCalledWith(validUUID)
    })

    it('should reject empty merchantPaymentId parameter', async () => {
      const request = createRequest('') // Empty string

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('merchantPaymentIdが必要です')
      expect(mockPayPayService.getPaymentDetails).not.toHaveBeenCalled()
    })

    it('should reject malformed UUID variations', async () => {
      const invalidUUIDs = [
        '12345678-1234-1234-1234',        // Too short
        '12345678-1234-1234-1234-123456789012-extra', // Too long
        '12345678_1234_1234_1234_123456789012',        // Wrong separators
        '12345678-1234-1234-1234-12345678901g',        // Invalid character
        'not-a-uuid-at-all',
        '123',
      ]

      for (const invalidUUID of invalidUUIDs) {
        const request = createRequest(invalidUUID)
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('無効な決済IDです')
        expect(mockPayPayService.getPaymentDetails).not.toHaveBeenCalled()

        jest.clearAllMocks()
      }
    })
  })

  describe('PayPay service errors', () => {
    it('should handle PayPay service failure', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      const mockPayPayResponse = {
        resultInfo: { code: 'FAILURE', message: 'PayPay error occurred' },
        data: null,
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('PayPay決済状況の取得に失敗しました')
      expect(consoleSpy).toHaveBeenCalledWith('PayPay error:', mockPayPayResponse.resultInfo)

      consoleSpy.mockRestore()
    })

    it('should handle PayPay service exception', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      mockPayPayService.getPaymentDetails.mockRejectedValue(new Error('PayPay SDK error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('決済状況確認中にエラーが発生しました')
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should handle network timeout errors', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      mockPayPayService.getPaymentDetails.mockRejectedValue(new Error('Network timeout'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('決済状況確認中にエラーが発生しました')

      consoleSpy.mockRestore()
    })
  })

  describe('response format validation', () => {
    it('should include all required fields in successful response', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'COMPLETED',
          amount: { amount: 1500, currency: 'JPY' },
          orderDescription: 'テスト決済',
          acceptedAt: 1640995200,
          paymentId: 'pay-456',
          merchantPaymentId,
        },
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('success', true)
      expect(responseData).toHaveProperty('merchantPaymentId', merchantPaymentId)
      expect(responseData).toHaveProperty('status', 'COMPLETED')
      expect(responseData).toHaveProperty('amount')
      expect(responseData).toHaveProperty('orderDescription')
      expect(responseData).toHaveProperty('acceptedAt')
      expect(responseData.amount).toEqual({ amount: 1500, currency: 'JPY' })
    })

    it('should handle missing optional fields gracefully', async () => {
      const merchantPaymentId = 'test-merchant-id-12345678-1234-1234-1234-123456789012'

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'CREATED',
          merchantPaymentId,
          // Missing optional fields like acceptedAt
        },
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.status).toBe('CREATED')
      expect(responseData.acceptedAt).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in merchantPaymentId', async () => {
      // Valid UUID with lowercase characters
      const merchantPaymentId = 'abcdef01-2345-6789-abcd-ef0123456789'

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'CREATED',
          merchantPaymentId,
        },
      }

      mockPayPayService.getPaymentDetails.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(merchantPaymentId)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPayPayService.getPaymentDetails).toHaveBeenCalledWith(merchantPaymentId)
    })
  })
})
