'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorUtils } from '@/lib/client-error-handler';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * エラーバウンダリコンポーネント
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーをログに記録
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // 開発環境では詳細なエラー情報を表示
    if (process.env.NODE_ENV === 'development') {
      console.error('Error component stack:', errorInfo.componentStack);
    }

    // カスタムエラーハンドラーを実行
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // エラーレポート
    const apiError = errorUtils.wrapError(error);
    const errorReport = apiError.generateReport({
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    if (errorUtils.shouldAutoReport(apiError)) {
      console.error('Auto-reporting error:', errorReport);
      // ここで実際のエラーレポートサービスに送信
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * デフォルトのエラーフォールバックコンポーネント
 */
interface DefaultErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            エラーが発生しました
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            申し訳ございません。予期しないエラーが発生しました。
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {isDevelopment && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    開発者向け情報
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p className="font-mono break-all">{error.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={resetError}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              再試行
            </button>
            <button
              onClick={() => window.location.reload()}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ページを再読み込み
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => window.history.back()}
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              前のページに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 関数型コンポーネント用のエラーバウンダリHOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: (error: Error, resetError: () => void) => ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}

/**
 * エラー表示用のコンポーネント
 */
interface ErrorDisplayProps {
  title?: string;
  message?: string;
  action?: () => void;
  actionLabel?: string;
  showDetails?: boolean;
  errorId?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'エラーが発生しました',
  message = 'もう一度お試しください。',
  action,
  actionLabel = '再試行',
  showDetails = false,
  errorId,
}) => {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          {showDetails && errorId && (
            <div className="mt-2 text-xs text-red-600">
              エラーID: {errorId}
            </div>
          )}
          {action && (
            <div className="mt-4">
              <button
                onClick={action}
                className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ローディング表示付きエラーコンポーネント
 */
interface AsyncErrorProps {
  loading: boolean;
  error: any;
  children: ReactNode;
  fallback?: ReactNode;
}

export const AsyncError: React.FC<AsyncErrorProps> = ({
  loading,
  error,
  children,
  fallback,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const apiError = errorUtils.wrapError(error);
    const displayInfo = apiError.displayInfo;

    return (
      <ErrorDisplay
        title={displayInfo.message}
        errorId={displayInfo.id}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    );
  }

  return <>{children}</>;
};