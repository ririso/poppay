/**
 * 統一エラーハンドリングシステムの統合テスト
 */

import { POST as createQRPost } from '@/app/api/payments/create-qr/route';
import { GET as statusGet } from '@/app/api/payments/status/route';
import { POST as webhookPost } from '@/app/api/webhook/route';
import { NextRequest } from 'next/server';
import { PayPayService } from '@/lib/paypay';
import { createSupabaseAdmin } from '@/lib/supabase';
import { isApiError, isApiSuccess } from '@/lib/client-error-handler';
import { ErrorCategory, ErrorSeverity } from '@/types/errors';

// Mock dependencies
jest.mock('@/lib/paypay');
jest.mock('@/lib/supabase');
jest.mock('qrcode');
jest.mock('@/lib/logger');

const mockPayPayService = PayPayService as jest.Mocked<typeof PayPayService>;
const mockCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;

describe('Unified Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Error Flow', () => {
    it('should handle validation error from create-qr to client', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: JSON.stringify({
          amount: -100, // Invalid amount
          description: 'Test payment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createQRPost(request);
      const responseData = await response.json();

      // Server-side error structure validation
      expect(response.status).toBe(400);
      expect(isApiError(responseData)).toBe(true);
      expect(responseData.error.category).toBe(ErrorCategory.VALIDATION);
      expect(responseData.error.severity).toBe(ErrorSeverity.LOW);
      expect(responseData.error.id).toMatch(/^ERR_\d+_[a-z0-9]+$/);
      expect(responseData.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Error message should be user-friendly
      expect(responseData.error.message).toContain('金額');
      expect(responseData.error.message).not.toContain('zod');
      expect(responseData.error.message).not.toContain('validation');
    });

    it('should handle PayPay API error consistently', async () => {
      const mockPayPayResponse = {
        resultInfo: {
          code: 'FAILURE',
          message: 'PayPay API temporarily unavailable',
        },
        data: null,
      };

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse);

      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          description: 'Test payment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createQRPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(502);
      expect(isApiError(responseData)).toBe(true);
      expect(responseData.error.category).toBe(ErrorCategory.PAYPAY_API);
      expect(responseData.error.severity).toBe(ErrorSeverity.HIGH);
      expect(responseData.error.details).toEqual({
        resultInfo: mockPayPayResponse.resultInfo,
        operation: 'QRコード生成',
      });
    });

    it('should handle database error in webhook', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Database connection failed' } }),
      };

      mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

      // Mock environment variable
      process.env.PAYPAY_WEBHOOK_SECRET = 'test-secret';

      // Create valid webhook signature
      const payload = JSON.stringify({
        merchantPaymentId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'COMPLETED',
        acceptedAt: Date.now() / 1000,
      });

      const crypto = require('crypto');
      const signature = `sha256=${crypto
        .createHmac('sha256', 'test-secret')
        .update(payload)
        .digest('hex')}`;

      const request = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-paypay-signature': signature,
        },
      });

      const response = await webhookPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(isApiError(responseData)).toBe(true);
      expect(responseData.error.category).toBe(ErrorCategory.DATABASE);
      expect(responseData.error.code).toBe('TRANSACTION_UPDATE_FAILED');
    });
  });

  describe('Error Consistency Across APIs', () => {
    it('should provide consistent error structure across all APIs', async () => {
      const testCases = [
        {
          name: 'create-qr validation error',
          request: () => createQRPost(
            new NextRequest('http://localhost:3000/api/payments/create-qr', {
              method: 'POST',
              body: JSON.stringify({ amount: 0 }),
              headers: { 'Content-Type': 'application/json' },
            })
          ),
          expectedStatus: 400,
          expectedCategory: ErrorCategory.VALIDATION,
        },
        {
          name: 'status validation error',
          request: () => statusGet(
            new NextRequest('http://localhost:3000/api/payments/status?merchantPaymentId=invalid-id')
          ),
          expectedStatus: 400,
          expectedCategory: ErrorCategory.VALIDATION,
        },
      ];

      for (const testCase of testCases) {
        const response = await testCase.request();
        const responseData = await response.json();

        expect(response.status).toBe(testCase.expectedStatus);
        expect(isApiError(responseData)).toBe(true);
        expect(responseData.error.category).toBe(testCase.expectedCategory);

        // Consistent error structure
        expect(responseData.error).toEqual(
          expect.objectContaining({
            id: expect.stringMatching(/^ERR_\d+_[a-z0-9]+$/),
            code: expect.any(String),
            message: expect.any(String),
            category: expect.any(String),
            severity: expect.any(String),
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          })
        );
      }
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors with appropriate detail level', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger a high-severity error
      mockPayPayService.createQRCode.mockRejectedValue(new Error('Critical PayPay failure'));

      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          description: 'Test payment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await createQRPost(request);

      // Verify error was logged with appropriate level
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HIGH ERROR]'),
        expect.objectContaining({
          id: expect.any(String),
          message: expect.any(String),
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Success Response Consistency', () => {
    it('should provide consistent success response structure', async () => {
      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
          codeId: 'test-code-id',
        },
        merchantPaymentId: 'test-merchant-id',
      };

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse);

      // Mock QR code generation
      const QRCode = require('qrcode');
      QRCode.toDataURL = jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode');

      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          description: 'Test payment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createQRPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(isApiSuccess(responseData)).toBe(true);
      expect(responseData).toEqual({
        success: true,
        data: expect.objectContaining({
          merchantPaymentId: 'test-merchant-id',
          qrCode: 'data:image/png;base64,mockQRCode',
          codeUrl: 'paypay://payment?code=test',
          amount: 1000,
          description: 'Test payment',
        }),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should handle partial failures gracefully', async () => {
      // Simulate PayPay success but QR generation failure
      const mockPayPayResponse = {
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          url: 'paypay://payment?code=test',
          merchantPaymentId: 'test-merchant-id',
        },
        merchantPaymentId: 'test-merchant-id',
      };

      mockPayPayService.createQRCode.mockResolvedValue(mockPayPayResponse);

      // Mock QR code generation failure
      const QRCode = require('qrcode');
      QRCode.toDataURL = jest.fn().mockRejectedValue(new Error('QR generation failed'));

      const request = new NextRequest('http://localhost:3000/api/payments/create-qr', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          description: 'Test payment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createQRPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(isApiError(responseData)).toBe(true);
      expect(responseData.error.category).toBe(ErrorCategory.INTERNAL);

      // Should still provide meaningful error message
      expect(responseData.error.message).toContain('サーバー');
    });
  });
});