import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiErrorHandler } from '@/lib/error-handler';
import {
  AppError,
  ValidationError,
  PayPayError,
  DatabaseError,
  WebhookError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
} from '@/types/errors';

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  log: jest.spyOn(console, 'log').mockImplementation(),
};

describe('ApiErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('success', () => {
    it('should create success response', () => {
      const data = { test: 'data' };
      const response = ApiErrorHandler.success(data);

      expect(response).toEqual({
        success: true,
        data,
        timestamp: expect.any(String),
      });
    });
  });

  describe('error', () => {
    it('should create error response from AppError', () => {
      const appError = new ValidationError('Test validation error');
      const response = ApiErrorHandler.error(appError, '/test-path');

      expect(response).toEqual({
        success: false,
        error: {
          id: appError.id,
          code: appError.code,
          message: appError.message,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: expect.any(String),
          path: '/test-path',
        },
      });
    });

    it('should create error response from regular Error', () => {
      const error = new Error('Regular error');
      const response = ApiErrorHandler.error(error);

      expect(response).toMatchObject({
        success: false,
        error: {
          id: expect.any(String),
          code: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining('サーバー内部エラー'),
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('handleApi', () => {
    it('should handle successful API call', async () => {
      const handler = jest.fn().mockResolvedValue({ test: 'data' });
      const response = await ApiErrorHandler.handleApi(handler, '/test');

      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: { test: 'data' },
        timestamp: expect.any(String),
      });
    });

    it('should handle AppError', async () => {
      const validationError = new ValidationError('Validation failed');
      const handler = jest.fn().mockRejectedValue(validationError);
      const response = await ApiErrorHandler.handleApi(handler, '/test');

      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          category: ErrorCategory.VALIDATION,
        },
      });
    });

    it('should handle ZodError', async () => {
      const schema = z.object({ name: z.string() });
      const zodError = schema.safeParse({ name: 123 }).error!;
      const handler = jest.fn().mockRejectedValue(zodError);
      const response = await ApiErrorHandler.handleApi(handler, '/test');

      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: {
          category: ErrorCategory.VALIDATION,
        },
      });
    });

    it('should handle generic error', async () => {
      const error = new Error('Generic error');
      const handler = jest.fn().mockRejectedValue(error);
      const response = await ApiErrorHandler.handleApi(handler, '/test');

      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: {
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
        },
      });
    });
  });

  describe('helper methods', () => {
    it('should create validation error', () => {
      const error = ApiErrorHandler.validationError('Test message', { field: 'test' });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ field: 'test' });
    });

    it('should create PayPay error', () => {
      const payPayResponse = {
        resultInfo: { code: 'FAILURE', message: 'PayPay failed' },
      };
      const error = ApiErrorHandler.payPayError(payPayResponse, 'test operation');

      expect(error).toBeInstanceOf(PayPayError);
      expect(error.message).toContain('PayPay');
    });

    it('should create database error', () => {
      const error = ApiErrorHandler.databaseError('DB error', { table: 'users' });

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('DB error');
      expect(error.details).toEqual({ table: 'users' });
    });

    it('should create webhook error', () => {
      const error = ApiErrorHandler.webhookError('Webhook failed', { signature: 'invalid' });

      expect(error).toBeInstanceOf(WebhookError);
      expect(error.message).toBe('Webhook failed');
      expect(error.details).toEqual({ signature: 'invalid' });
    });
  });

  describe('PayPay response validation', () => {
    it('should identify successful PayPay response', () => {
      const response = { resultInfo: { code: 'SUCCESS' } };
      expect(ApiErrorHandler.isPayPaySuccess(response)).toBe(true);
    });

    it('should identify failed PayPay response', () => {
      const response = { resultInfo: { code: 'FAILURE' } };
      expect(ApiErrorHandler.isPayPaySuccess(response)).toBe(false);
    });

    it('should extract PayPay error', () => {
      const response = { resultInfo: { code: 'FAILURE', message: 'PayPay error' } };
      const error = ApiErrorHandler.extractPayPayError(response, 'test');

      expect(error).toBeInstanceOf(PayPayError);
      expect(error.message).toContain('PayPay');
    });
  });

  describe('environment validation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should pass validation with required environment variables', () => {
      process.env.TEST_VAR = 'test-value';

      expect(() => {
        ApiErrorHandler.validateEnvironment(['TEST_VAR']);
      }).not.toThrow();
    });

    it('should throw error for missing environment variables', () => {
      delete process.env.MISSING_VAR;

      expect(() => {
        ApiErrorHandler.validateEnvironment(['MISSING_VAR']);
      }).toThrow(AppError);
    });
  });

  describe('specialized error helpers', () => {
    it('should create webhook signature error', () => {
      const error = ApiErrorHandler.webhookSignatureError();

      expect(error).toBeInstanceOf(WebhookError);
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SIGNATURE_INVALID);
    });

    it('should create webhook payload error', () => {
      const error = ApiErrorHandler.webhookPayloadError({ test: 'data' });

      expect(error).toBeInstanceOf(WebhookError);
      expect(error.code).toBe(ErrorCodes.WEBHOOK_PAYLOAD_INVALID);
      expect(error.details).toEqual({ code: ErrorCodes.WEBHOOK_PAYLOAD_INVALID, test: 'data' });
    });

    it('should create transaction create error', () => {
      const error = ApiErrorHandler.transactionCreateError({ merchantId: '123' });

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.TRANSACTION_CREATE_FAILED);
    });

    it('should create transaction update error', () => {
      const error = ApiErrorHandler.transactionUpdateError({ merchantId: '123' });

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.TRANSACTION_UPDATE_FAILED);
    });

    it('should create transaction not found error', () => {
      const error = ApiErrorHandler.transactionNotFoundError('merchant-123');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCodes.TRANSACTION_NOT_FOUND);
      expect(error.details).toEqual({
        code: ErrorCodes.TRANSACTION_NOT_FOUND,
        merchantPaymentId: 'merchant-123',
      });
    });
  });

  describe('status code mapping', () => {
    it('should return correct status codes for different error categories', async () => {
      const testCases = [
        { error: new ValidationError('test'), expectedStatus: 400 },
        { error: new PayPayError('test'), expectedStatus: 502 },
        { error: new DatabaseError('test'), expectedStatus: 500 },
        { error: new WebhookError('test'), expectedStatus: 400 },
      ];

      for (const { error, expectedStatus } of testCases) {
        const handler = jest.fn().mockRejectedValue(error);
        const response = await ApiErrorHandler.handleApi(handler);
        expect(response.status).toBe(expectedStatus);
      }
    });
  });
});