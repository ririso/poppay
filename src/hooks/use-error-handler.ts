'use client';

import { useState, useCallback, useEffect } from 'react';
import { ApiError, ClientErrorHandler, errorUtils } from '@/lib/client-error-handler';
import type { ErrorState, UseErrorHandlerOptions } from '@/lib/client-error-handler';

/**
 * エラーハンドリング用のReact Hook
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorState {
  const [error, setError] = useState<ApiError | null>(null);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: ApiError) => {
    setError(error);

    // カスタムエラーハンドラーを実行
    if (options.onError) {
      options.onError(error);
    }

    // 自動レポート
    if (options.reportError && errorUtils.shouldAutoReport(error)) {
      console.error('Auto-reporting error:', error.generateReport());
      // ここで実際のエラーレポートサービスに送信
    }

    // トーストメッセージの表示（オプション）
    if (options.showToast) {
      // ここでトーストライブラリを使用してメッセージを表示
      console.log('Toast:', error.displayInfo.message);
    }
  }, [options]);

  return {
    error,
    isError: !!error,
    displayInfo: error ? ClientErrorHandler.getDisplayInfo(error.apiError) : null,
    reset,
    handleError,
  };
}

/**
 * 非同期関数のエラーハンドリング用Hook
 */
export function useAsyncError() {
  const [loading, setLoading] = useState(false);
  const { error, isError, displayInfo, reset, handleError } = useErrorHandler({
    showToast: true,
    reportError: true,
  });

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    onSuccess?: (data: T) => void
  ): Promise<T | null> => {
    setLoading(true);
    reset();

    try {
      const result = await asyncFn();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      const apiError = errorUtils.wrapError(error);
      handleError(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [reset, handleError]);

  return {
    loading,
    error,
    isError,
    displayInfo,
    execute,
    reset,
  };
}

/**
 * API呼び出し専用のHook
 */
export function useApiCall<T = any>() {
  const { loading, error, isError, displayInfo, execute, reset } = useAsyncError();

  const call = useCallback(async (
    url: string,
    options?: RequestInit
  ): Promise<T | null> => {
    return execute(async () => {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    });
  }, [execute]);

  return {
    loading,
    error,
    isError,
    displayInfo,
    call,
    reset,
  };
}

/**
 * フォーム送信用のHook
 */
export function useFormSubmission<T = any>() {
  const { loading, error, isError, displayInfo, execute, reset } = useAsyncError();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submit = useCallback(async (
    submitFn: () => Promise<T>,
    onSuccess?: (data: T) => void
  ): Promise<boolean> => {
    const result = await execute(submitFn, (data) => {
      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess(data);
      }
    });

    return result !== null;
  }, [execute]);

  const resetForm = useCallback(() => {
    setIsSubmitted(false);
    reset();
  }, [reset]);

  return {
    loading,
    error,
    isError,
    displayInfo,
    isSubmitted,
    submit,
    reset: resetForm,
  };
}

/**
 * データフェッチ用のHook
 */
export function useDataFetch<T = any>(
  url: string | null,
  options: RequestInit = {}
) {
  const [data, setData] = useState<T | null>(null);
  const { loading, error, isError, displayInfo, execute, reset } = useAsyncError();

  const fetchData = useCallback(async (fetchUrl?: string) => {
    if (!fetchUrl && !url) return;

    const targetUrl = fetchUrl || url!;
    return execute(async () => {
      const response = await fetch(targetUrl, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setData(responseData);
      return responseData;
    });
  }, [url, execute, options]);

  useEffect(() => {
    if (url) {
      fetchData();
    }
  }, [url, fetchData]);

  const refetch = useCallback(() => {
    if (url) {
      return fetchData();
    }
    return Promise.resolve(null);
  }, [url, fetchData]);

  return {
    data,
    loading,
    error,
    isError,
    displayInfo,
    refetch,
    reset,
  };
}

/**
 * PayPay決済用のHook
 */
export function usePayPay() {
  const { loading, error, isError, displayInfo, execute, reset } = useAsyncError();

  const createQR = useCallback(async (amount: number, description?: string) => {
    return execute(async () => {
      const response = await fetch('/api/payments/create-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    });
  }, [execute]);

  const getStatus = useCallback(async (merchantPaymentId: string) => {
    return execute(async () => {
      const response = await fetch(
        `/api/payments/status?merchantPaymentId=${encodeURIComponent(merchantPaymentId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    });
  }, [execute]);

  return {
    loading,
    error,
    isError,
    displayInfo,
    createQR,
    getStatus,
    reset,
  };
}

/**
 * エラーバウンダリ用のHook
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetErrorBoundary = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  useEffect(() => {
    if (error) {
      // エラーをコンソールに出力
      console.error('Error Boundary captured error:', error);

      // 開発環境では詳細なエラー情報を表示
      if (process.env.NODE_ENV === 'development') {
        console.error('Error stack:', error.stack);
      }
    }
  }, [error]);

  return {
    error,
    hasError: !!error,
    resetErrorBoundary,
    captureError,
  };
}

/**
 * グローバルエラーハンドリング用のHook
 */
export function useGlobalErrorHandler() {
  const { handleError } = useErrorHandler({
    showToast: true,
    reportError: true,
  });

  useEffect(() => {
    // ハンドルされていないPromiseエラーを捕捉
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = errorUtils.wrapError(event.reason);
      handleError(error);
    };

    // JavaScriptエラーを捕捉
    const handleError = (event: ErrorEvent) => {
      const error = errorUtils.wrapError(event.error);
      handleError(error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleError]);
}