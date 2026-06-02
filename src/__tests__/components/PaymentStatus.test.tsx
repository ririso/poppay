/**
 * PaymentStatusコンポーネントのテスト
 * page.tsxからの決済状況表示部分の分割後の振る舞い確認
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// PaymentStatusコンポーネントのインターフェース
type TransactionStatus = 'CREATED' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

interface PaymentInfo {
  merchantPaymentId: string;
  amount: number;
  description: string;
}

interface PaymentStatus {
  status: TransactionStatus;
  acceptedAt?: string;
}

interface PaymentStatusProps {
  paymentInfo: PaymentInfo;
  paymentStatus: PaymentStatus;
  isMonitoring?: boolean;
  onStatusCheck?: (merchantPaymentId: string) => Promise<PaymentStatus | null>;
  pollingInterval?: number;
}

// モック：実装前はコンポーネントをモック
const MockPaymentStatus: React.FC<PaymentStatusProps> = ({
  paymentInfo,
  paymentStatus,
  isMonitoring = false,
  onStatusCheck,
  pollingInterval = 3000
}) => {
  const [currentStatus, setCurrentStatus] = React.useState(paymentStatus);

  // ポーリング機能
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isMonitoring && onStatusCheck) {
      intervalId = setInterval(async () => {
        try {
          const result = await onStatusCheck(paymentInfo.merchantPaymentId);
          if (result) {
            setCurrentStatus(result);
            // 完了状態または失敗状態の場合はポーリング停止
            if (result.status === 'COMPLETED' || result.status === 'FAILED' || result.status === 'EXPIRED') {
              // ポーリング停止の通知は親コンポーネントに委ねる
            }
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, pollingInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMonitoring, onStatusCheck, paymentInfo.merchantPaymentId, pollingInterval]);

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      case 'EXPIRED':
        return 'text-yellow-600 bg-yellow-100';
      case 'CREATED':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return '支払い完了';
      case 'FAILED':
        return '支払い失敗';
      case 'EXPIRED':
        return '期限切れ';
      case 'CREATED':
        return '支払い待ち';
      default:
        return '不明';
    }
  };

  const formatAmount = (amount: number) => amount.toLocaleString();

  return (
    <div
      className="border-t border-gray-100 p-6 sm:p-8 bg-gray-50"
      data-testid="payment-status-section"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">決済状況</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus.status)}`}
          data-testid="status-badge"
        >
          {getStatusText(currentStatus.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600" data-testid="payment-details">
        <div className="flex justify-between">
          <span>金額:</span>
          <span className="font-semibold">¥{formatAmount(paymentInfo.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>説明:</span>
          <span className="font-semibold">{paymentInfo.description}</span>
        </div>
        {currentStatus.acceptedAt && (
          <div className="flex justify-between" data-testid="accepted-time">
            <span>完了時刻:</span>
            <span className="font-semibold">
              {new Date(currentStatus.acceptedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        )}
      </div>

      {isMonitoring && (
        <div className="mt-4 flex items-center text-blue-600" data-testid="monitoring-indicator">
          <svg
            className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            data-testid="monitoring-spinner"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">支払いを監視中...</span>
        </div>
      )}
    </div>
  );
};

describe('PaymentStatus', () => {
  const mockPaymentInfo: PaymentInfo = {
    merchantPaymentId: 'test-merchant-payment-id',
    amount: 1000,
    description: '30分延長料金'
  };

  const mockOnStatusCheck = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic rendering', () => {
    it('should render payment status section', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 決済状況セクションが表示される
      expect(screen.getByTestId('payment-status-section')).toBeInTheDocument();
      expect(screen.getByText('決済状況')).toBeInTheDocument();
    });

    it('should render payment details', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: お支払い詳細が表示される
      const details = screen.getByTestId('payment-details');
      expect(details).toBeInTheDocument();
      expect(screen.getByText('¥1,000')).toBeInTheDocument();
      expect(screen.getByText('30分延長料金')).toBeInTheDocument();
    });
  });

  describe('Status badge display', () => {
    it('should display CREATED status with blue styling', () => {
      // Given: CREATED status
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 青色のCREATEDステータスが表示される
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('支払い待ち');
      expect(badge).toHaveClass('text-blue-600', 'bg-blue-100');
    });

    it('should display COMPLETED status with green styling', () => {
      // Given: COMPLETED status
      const paymentStatus: PaymentStatus = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 緑色のCOMPLETEDステータスが表示される
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('支払い完了');
      expect(badge).toHaveClass('text-green-600', 'bg-green-100');
    });

    it('should display FAILED status with red styling', () => {
      // Given: FAILED status
      const paymentStatus: PaymentStatus = { status: 'FAILED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 赤色のFAILEDステータスが表示される
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('支払い失敗');
      expect(badge).toHaveClass('text-red-600', 'bg-red-100');
    });

    it('should display EXPIRED status with yellow styling', () => {
      // Given: EXPIRED status
      const paymentStatus: PaymentStatus = { status: 'EXPIRED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 黄色のEXPIREDステータスが表示される
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('期限切れ');
      expect(badge).toHaveClass('text-yellow-600', 'bg-yellow-100');
    });
  });

  describe('Completion time display', () => {
    it('should display completion time when payment is completed', () => {
      // Given: COMPLETED status with acceptedAt
      const paymentStatus: PaymentStatus = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 完了時刻が表示される
      const acceptedTime = screen.getByTestId('accepted-time');
      expect(acceptedTime).toBeInTheDocument();
      expect(screen.getByText('完了時刻:')).toBeInTheDocument();
      expect(screen.getByText('2023/12/1 19:30:00')).toBeInTheDocument();
    });

    it('should not display completion time for non-completed status', () => {
      // Given: CREATED status (not completed)
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 完了時刻が表示されない
      expect(screen.queryByTestId('accepted-time')).not.toBeInTheDocument();
    });

    it('should format completion time in Japanese locale', () => {
      // Given: COMPLETED status with specific time
      const paymentStatus: PaymentStatus = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-31T23:59:59.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 日本の形式で時刻が表示される
      expect(screen.getByText('2024/1/1 8:59:59')).toBeInTheDocument();
    });
  });

  describe('Monitoring functionality', () => {
    it('should display monitoring indicator when isMonitoring is true', () => {
      // Given: Monitoring enabled
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: isMonitoring=trueでレンダリング
      render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
        />
      );

      // Then: 監視インジケーターが表示される
      expect(screen.getByTestId('monitoring-indicator')).toBeInTheDocument();
      expect(screen.getByText('支払いを監視中...')).toBeInTheDocument();
      expect(screen.getByTestId('monitoring-spinner')).toBeInTheDocument();
    });

    it('should not display monitoring indicator when isMonitoring is false', () => {
      // Given: Monitoring disabled
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: isMonitoring=falseでレンダリング
      render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={false}
        />
      );

      // Then: 監視インジケーターが表示されない
      expect(screen.queryByTestId('monitoring-indicator')).not.toBeInTheDocument();
    });

    it('should call onStatusCheck periodically when monitoring', async () => {
      // Given: Monitoring enabled with status check handler
      const paymentStatus: PaymentStatus = { status: 'CREATED' };
      mockOnStatusCheck.mockResolvedValue({ status: 'CREATED' });

      // When: 監視モードでレンダリング
      render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
          onStatusCheck={mockOnStatusCheck}
          pollingInterval={1000}
        />
      );

      // Then: 定期的にonStatusCheckが呼ばれる
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnStatusCheck).toHaveBeenCalledWith('test-merchant-payment-id');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnStatusCheck).toHaveBeenCalledTimes(2);
    });

    it('should update status when onStatusCheck returns new status', async () => {
      // Given: 監視中のPaymentStatus
      const paymentStatus: PaymentStatus = { status: 'CREATED' };
      mockOnStatusCheck
        .mockResolvedValueOnce({ status: 'CREATED' })
        .mockResolvedValueOnce({
          status: 'COMPLETED',
          acceptedAt: '2023-12-01T10:30:00.000Z'
        });

      // When: 監視モードでレンダリング
      render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
          onStatusCheck={mockOnStatusCheck}
          pollingInterval={1000}
        />
      );

      // 最初のポーリング
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Then: ステータスが更新される
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        // ステータス更新の完了を待つ
      });

      expect(screen.getByText('支払い完了')).toBeInTheDocument();
      expect(screen.getByTestId('accepted-time')).toBeInTheDocument();
    });
  });

  describe('Amount formatting', () => {
    it('should format large amounts with commas', () => {
      // Given: 大きな金額のPaymentInfo
      const largeAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1000000
      };
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={largeAmountPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 金額がカンマ区切りで表示される
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    });

    it('should format small amounts correctly', () => {
      // Given: 小さな金額のPaymentInfo
      const smallAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1
      };
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={smallAmountPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 小さな金額が正しく表示される
      expect(screen.getByText('¥1')).toBeInTheDocument();
    });
  });

  describe('Error handling in status checking', () => {
    it('should handle status check errors gracefully', () => {
      // Given: エラーを返すonStatusCheck
      const paymentStatus: PaymentStatus = { status: 'CREATED' };
      mockOnStatusCheck.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // When: 監視モードでレンダリング
      render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
          onStatusCheck={mockOnStatusCheck}
          pollingInterval={1000}
        />
      );

      // Then: エラーが適切に処理される
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Status check error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Component lifecycle', () => {
    it('should cleanup interval on unmount', () => {
      // Given: 監視中のPaymentStatus
      const paymentStatus: PaymentStatus = { status: 'CREATED' };
      const { unmount } = render(
        <MockPaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
          onStatusCheck={mockOnStatusCheck}
          pollingInterval={1000}
        />
      );

      // When: コンポーネントをアンマウント
      unmount();

      // Then: インターバルがクリアされる（エラーが発生しない）
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // アンマウント後はonStatusCheckが呼ばれない
      expect(mockOnStatusCheck).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatus = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 適切な見出し構造になっている
      const heading = screen.getByRole('heading', { level: 3, name: '決済状況' });
      expect(heading).toBeInTheDocument();
    });

    it('should provide accessible status information', () => {
      // Given: COMPLETED status
      const paymentStatus: PaymentStatus = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<MockPaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: ステータス情報がアクセシブル
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('支払い完了');
      expect(badge).toHaveClass('text-green-600');
    });
  });
});