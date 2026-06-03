import {
  isApiError,
  isApiSuccess,
  ClientErrorHandler,
  ApiClient,
  ApiError,
  UserFriendlyMessages,
  ErrorIcons,
  ErrorColors,
  errorUtils,
} from '@/lib/client-error-handler';
import {
  ErrorCategory,
  ErrorSeverity,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '@/types/errors';

// Mock fetch for ApiClient tests
global.fetch = jest.fn();

describe('Client Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type Guards', () => {
    it('should identify API error response', () => {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
        },
      };

      expect(isApiError(errorResponse)).toBe(true);
      expect(isApiSuccess(errorResponse)).toBe(false);
    });

    it('should identify API success response', () => {
      const successResponse: ApiSuccessResponse<{ test: string }> = {
        success: true,
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
      };

      expect(isApiSuccess(successResponse)).toBe(true);
      expect(isApiError(successResponse)).toBe(false);
    });

    it('should handle invalid responses', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError({ invalid: 'response' })).toBe(false);
      expect(isApiSuccess({ invalid: 'response' })).toBe(false);
    });
  });

  describe('ClientErrorHandler', () => {
    const mockErrorResponse: ApiErrorResponse = {
      success: false,
      error: {
        id: 'test-error-id',
        code: 'VALIDATION_FAILED',
        message: 'Test validation error',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        timestamp: new Date().toISOString(),
      },
    };

    it('should get user-friendly message', () => {
      const message = ClientErrorHandler.getMessage(mockErrorResponse);
      expect(message).toBe(UserFriendlyMessages.VALIDATION_FAILED);
    });

    it('should get fallback message for unknown error code', () => {
      const unknownErrorResponse = {
        ...mockErrorResponse,
        error: {
          ...mockErrorResponse.error,
          code: 'UNKNOWN_ERROR_CODE' as any,
        },
      };

      const message = ClientErrorHandler.getMessage(unknownErrorResponse);
      expect(message).toBe(UserFriendlyMessages.UNKNOWN_ERROR);
    });

    it('should get error icon', () => {
      const icon = ClientErrorHandler.getIcon(mockErrorResponse);
      expect(icon).toBe(ErrorIcons[ErrorCategory.VALIDATION]);
    });

    it('should get error color', () => {
      const color = ClientErrorHandler.getColor(mockErrorResponse);
      expect(color).toBe(ErrorColors.LOW);
    });

    it('should get display info', () => {
      const displayInfo = ClientErrorHandler.getDisplayInfo(mockErrorResponse);

      expect(displayInfo).toEqual({
        id: 'test-error-id',
        message: UserFriendlyMessages.VALIDATION_FAILED,
        icon: ErrorIcons[ErrorCategory.VALIDATION],
        color: ErrorColors.LOW,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        timestamp: mockErrorResponse.error.timestamp,
        canRetry: false,
        shouldReload: false,
      });
    });

    it('should determine retry capability correctly', () => {
      const nonRetryableError = {
        ...mockErrorResponse,
        error: {
          ...mockErrorResponse.error,
          category: ErrorCategory.VALIDATION,
        },
      };

      const retryableError = {
        ...mockErrorResponse,
        error: {
          ...mockErrorResponse.error,
          category: ErrorCategory.NETWORK,
        },
      };

      expect(ClientErrorHandler.canRetry(nonRetryableError)).toBe(false);
      expect(ClientErrorHandler.canRetry(retryableError)).toBe(true);
    });

    it('should determine reload necessity correctly', () => {
      const reloadError = {
        ...mockErrorResponse,
        error: {
          ...mockErrorResponse.error,
          category: ErrorCategory.INTERNAL,
        },
      };

      const nonReloadError = {
        ...mockErrorResponse,
        error: {
          ...mockErrorResponse.error,
          category: ErrorCategory.VALIDATION,
        },
      };

      expect(ClientErrorHandler.shouldReload(reloadError)).toBe(true);
      expect(ClientErrorHandler.shouldReload(nonReloadError)).toBe(false);
    });

    it('should generate error report', () => {
      const context = { userId: '123', action: 'test' };
      const report = ClientErrorHandler.generateErrorReport(mockErrorResponse, context);

      expect(report).toMatchObject({
        errorId: 'test-error-id',
        timestamp: mockErrorResponse.error.timestamp,
        error: {
          id: 'test-error-id',
          code: 'VALIDATION_FAILED',
          message: 'Test validation error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
        },
        context,
      });
    });
  });

  describe('ApiError class', () => {
    const mockErrorResponse: ApiErrorResponse = {
      success: false,
      error: {
        id: 'test-error-id',
        code: 'VALIDATION_FAILED',
        message: 'Test validation error',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        timestamp: new Date().toISOString(),
      },
    };

    it('should create ApiError with correct properties', () => {
      const apiError = new ApiError(mockErrorResponse);

      expect(apiError).toBeInstanceOf(Error);
      expect(apiError.name).toBe('ApiError');
      expect(apiError.message).toBe(UserFriendlyMessages.VALIDATION_FAILED);
      expect(apiError.apiError).toBe(mockErrorResponse);
    });

    it('should provide display info', () => {
      const apiError = new ApiError(mockErrorResponse);
      const displayInfo = apiError.displayInfo;

      expect(displayInfo).toMatchObject({
        id: 'test-error-id',
        message: UserFriendlyMessages.VALIDATION_FAILED,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
      });
    });

    it('should generate error report', () => {
      const apiError = new ApiError(mockErrorResponse);
      const context = { test: 'context' };
      const report = apiError.generateReport(context);

      expect(report).toMatchObject({
        errorId: 'test-error-id',
        error: expect.any(Object),
        context,
      });
    });
  });

  describe('ApiClient', () => {
    it('should handle successful GET request', async () => {
      const mockData = { success: true, data: { test: 'value' } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await ApiClient.get('/test');
      expect(result).toEqual(mockData);
    });

    it('should handle successful POST request', async () => {
      const mockData = { success: true, data: { created: true } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await ApiClient.post('/test', { name: 'test' });
      expect(result).toEqual(mockData);

      expect(global.fetch).toHaveBeenCalledWith('/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test' }),
      });
    });

    it('should handle API error response', async () => {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(errorResponse),
      });

      await expect(ApiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle HTTP error without API error structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(ApiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(ApiClient.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('errorUtils', () => {
    it('should wrap ApiError correctly', () => {
      const apiError = new ApiError({
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
        },
      });

      const wrapped = errorUtils.wrapError(apiError);
      expect(wrapped).toBe(apiError);
    });

    it('should wrap regular Error', () => {
      const error = new Error('Regular error');
      const wrapped = errorUtils.wrapError(error);

      expect(wrapped).toBeInstanceOf(ApiError);
      expect(wrapped.message).toBe('Regular error');
      expect(wrapped.apiError.error.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should wrap unknown error', () => {
      const wrapped = errorUtils.wrapError('string error');

      expect(wrapped).toBeInstanceOf(ApiError);
      expect(wrapped.apiError.error.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should determine if user action is required', () => {
      const validationError = new ApiError({
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
        },
      });

      const networkError = new ApiError({
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date().toISOString(),
        },
      });

      expect(errorUtils.isUserActionRequired(validationError)).toBe(true);
      expect(errorUtils.isUserActionRequired(networkError)).toBe(false);
    });

    it('should determine if error should be auto-reported', () => {
      const lowSeverityError = new ApiError({
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
        },
      });

      const highSeverityError = new ApiError({
        success: false,
        error: {
          id: 'test-id',
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date().toISOString(),
        },
      });

      expect(errorUtils.shouldAutoReport(lowSeverityError)).toBe(false);
      expect(errorUtils.shouldAutoReport(highSeverityError)).toBe(true);
    });
  });
});