import { POST } from '@/app/api/webhook/route'
import { NextRequest } from 'next/server'

describe('/api/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('successful webhook processing', () => {
    it('should process valid PayPay webhook payload', async () => {
      const webhookPayload = {
        merchantPaymentId: 'test-merchant-id-12345678-1234-1234-1234-123456789012',
        status: 'COMPLETED',
        amount: 1000,
        eventType: 'payment.status.changed',
        eventDate: '2023-12-01T10:30:00Z',
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const request = createRequest(webhookPayload)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        message: 'Webhook processed successfully',
      })

      expect(consoleSpy).toHaveBeenCalledWith('PayPay Webhook received:', webhookPayload)

      consoleSpy.mockRestore()
    })

    it('should process webhook with different payment statuses', async () => {
      const statuses = ['CREATED', 'COMPLETED', 'FAILED', 'EXPIRED']

      for (const status of statuses) {
        jest.clearAllMocks()

        const webhookPayload = {
          merchantPaymentId: `test-merchant-id-${status}`,
          status,
          amount: 1000,
        }

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

        const request = createRequest(webhookPayload)
        const response = await POST(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(consoleSpy).toHaveBeenCalledWith('PayPay Webhook received:', webhookPayload)

        consoleSpy.mockRestore()
      }
    })

    it('should process webhook with minimal payload', async () => {
      const minimalPayload = {
        merchantPaymentId: 'test-merchant-id',
        status: 'COMPLETED',
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const request = createRequest(minimalPayload)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('PayPay Webhook received:', minimalPayload)

      consoleSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: 'invalid json string',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Webhook処理中にエラーが発生しました')
      expect(consoleSpy).toHaveBeenCalledWith('Webhook Error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('response format validation', () => {
    it('should return consistent response format for success', async () => {
      const webhookPayload = {
        merchantPaymentId: 'test-merchant-id',
        status: 'COMPLETED',
      }

      const request = createRequest(webhookPayload)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.headers.get('content-type')).toContain('application/json')
      expect(responseData).toHaveProperty('success')
      expect(responseData).toHaveProperty('message')
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Webhook processed successfully')
    })
  })
})
