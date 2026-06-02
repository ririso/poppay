import { POST } from '@/app/api/payments/create-qr/route'
import { PayPayService } from '@/lib/paypay'
import { NextRequest } from 'next/server'
import QRCode from 'qrcode'

// Mock dependencies
jest.mock('@/lib/paypay')
jest.mock('qrcode')

describe('/api/payments/create-qr', () => {
  const mockPayPayService = PayPayService as jest.Mocked<typeof PayPayService>
  const mockQRCode = QRCode as jest.Mocked<typeof QRCode>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/payments/create-qr', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('successful QR code creation', () => {
    it('should create QR code with valid input', async () => {
      const requestBody = {
        amount: 1000,
        description: 'Test payment',
      }

      const mockPayPayResponse = {
        resultInfo: {
          code: 'SUCCESS',
          message: 'Success',
          codeId: 'test-code-id'
        },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
          codeId: 'test-code-id',
          deeplink: 'paypay://payment?code=test',
          expiryDate: Date.now() + 300000,
          amount: { amount: 1000, currency: 'JPY' },
          orderDescription: 'Test payment',
          codeType: 'ORDER_QR'
        },
        merchantPaymentId: 'test-merchant-id',
      }

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse)
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode')

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        merchantPaymentId: 'test-merchant-id',
        qrCode: 'data:image/png;base64,mockQRCode',
        codeUrl: 'paypay://payment?code=test',
        amount: 1000,
        description: 'Test payment',
      })

      expect(mockPayPayService.createQRCode).toHaveBeenCalledWith({
        amount: 1000,
        description: 'Test payment',
      })

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith('paypay://payment?code=test', {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      })
    })
  })

  describe('input validation', () => {
    it('should reject request with missing amount', async () => {
      const requestBody = {
        description: 'Test payment',
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Number must be greater than 0')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with invalid amount (zero)', async () => {
      const requestBody = {
        amount: 0,
        description: 'Test payment',
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Number must be greater than 0')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with invalid amount (negative)', async () => {
      const requestBody = {
        amount: -100,
        description: 'Test payment',
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Number must be greater than 0')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with amount over limit', async () => {
      const requestBody = {
        amount: 1000001,
        description: 'Test payment',
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('金額は100万円以下で入力してください')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with missing description', async () => {
      const requestBody = {
        amount: 1000,
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('説明文を入力してください')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with empty description', async () => {
      const requestBody = {
        amount: 1000,
        description: '',
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('説明文を入力してください')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should reject request with description too long', async () => {
      const requestBody = {
        amount: 1000,
        description: 'a'.repeat(257),
      }

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('説明文は256文字以下で入力してください')
      expect(mockPayPayService.createQRCode).not.toHaveBeenCalled()
    })

    it('should accept maximum valid amount', async () => {
      const requestBody = {
        amount: 1000000,
        description: 'Maximum amount payment',
      }

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
        },
        merchantPaymentId: 'test-merchant-id',
      }

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse)
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode')

      const request = createRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPayPayService.createQRCode).toHaveBeenCalledWith({
        amount: 1000000,
        description: 'Maximum amount payment',
      })
    })

    it('should accept maximum valid description length', async () => {
      const requestBody = {
        amount: 1000,
        description: 'a'.repeat(256),
      }

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
        },
        merchantPaymentId: 'test-merchant-id',
      }

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse)
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode')

      const request = createRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPayPayService.createQRCode).toHaveBeenCalled()
    })
  })

  describe('PayPay service errors', () => {
    it('should handle PayPay service failure', async () => {
      const requestBody = {
        amount: 1000,
        description: 'Test payment',
      }

      const mockPayPayResponse = {
        resultInfo: { code: 'FAILURE', message: 'PayPay error occurred' },
        data: null,
      }

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse)

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('PayPay QRコード生成に失敗しました')
      expect(mockQRCode.toDataURL).not.toHaveBeenCalled()
    })

    it('should handle PayPay service exception', async () => {
      const requestBody = {
        amount: 1000,
        description: 'Test payment',
      }

      mockPayPayService.createQRCode.mockRejectedValue(new Error('PayPay SDK error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('QRコード生成中にエラーが発生しました')
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('QR code generation errors', () => {
    it('should handle QR code generation failure', async () => {
      const requestBody = {
        amount: 1000,
        description: 'Test payment',
      }

      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
        },
        merchantPaymentId: 'test-merchant-id',
      }

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse)
      mockQRCode.toDataURL.mockRejectedValue(new Error('QR code generation failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createRequest(requestBody)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('QRコード生成中にエラーが発生しました')
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('request parsing errors', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('QRコード生成中にエラーが発生しました')

      consoleSpy.mockRestore()
    })
  })
})
