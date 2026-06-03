/**
 * PaymentStatusコンポーネントのテスト
 * page.tsxからの決済状況表示部分の分割後の振る舞い確認
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentStatus, { PaymentInfo, PaymentStatus as PaymentStatusType } from '@/components/PaymentStatus';

// Mock LoadingSpinner component
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ text, ...props }: any) => (
    <div data-testid="loading-spinner" {...props}>
      {text}
    </div>
  ),
}));

describe('PaymentStatus', () => {
  const mockPaymentInfo: PaymentInfo = {
    merchantPaymentId: 'test-merchant-payment-id',
    qrCode: 'data:image/png;base64,test-qr-code',
    codeUrl: 'https://test-code-url.com',
    amount: 1000,
    description: '30分延長料金'
  };

  describe('Basic rendering', () => {
    it('should render payment status section', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 決済状況セクションが表示される
      expect(screen.getByRole('region', { name: '決済状況' })).toBeInTheDocument();
      expect(screen.getByText('決済状況')).toBeInTheDocument();
    });

    it('should render payment details', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: お支払い詳細が表示される
      expect(screen.getByText('¥1,000')).toBeInTheDocument();
      expect(screen.getByText('30分延長料金')).toBeInTheDocument();
    });
  });

  describe('Status badge display', () => {
    it('should display CREATED status with blue styling', () => {
      // Given: CREATED status
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 青色のCREATEDステータスが表示される
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('支払い待ち');
      expect(badge).toHaveClass('text-blue-600', 'bg-blue-100');
    });

    it('should display COMPLETED status with green styling', () => {
      // Given: COMPLETED status
      const paymentStatus: PaymentStatusType = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 緑色のCOMPLETEDステータスが表示される
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('支払い完了');
      expect(badge).toHaveClass('text-green-600', 'bg-green-100');
    });

    it('should display FAILED status with red styling', () => {
      // Given: FAILED status
      const paymentStatus: PaymentStatusType = { status: 'FAILED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 赤色のFAILEDステータスが表示される
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('支払い失敗');
      expect(badge).toHaveClass('text-red-600', 'bg-red-100');
    });

    it('should display EXPIRED status with yellow styling', () => {
      // Given: EXPIRED status
      const paymentStatus: PaymentStatusType = { status: 'EXPIRED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 黄色のEXPIREDステータスが表示される
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('期限切れ');
      expect(badge).toHaveClass('text-yellow-600', 'bg-yellow-100');
    });
  });

  describe('Completion time display', () => {
    it('should display completion time when payment is completed', () => {
      // Given: COMPLETED status with acceptedAt
      const paymentStatus: PaymentStatusType = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 完了時刻が表示される
      expect(screen.getByText('完了時刻:')).toBeInTheDocument();
      expect(screen.getByText(/2023/)).toBeInTheDocument();
    });

    it('should not display completion time for non-completed status', () => {
      // Given: CREATED status (not completed)
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 完了時刻が表示されない
      expect(screen.queryByText('完了時刻:')).not.toBeInTheDocument();
    });
  });

  describe('Monitoring functionality', () => {
    it('should display monitoring indicator when isMonitoring is true', () => {
      // Given: Monitoring enabled
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: isMonitoring=trueでレンダリング
      render(
        <PaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={true}
        />
      );

      // Then: 監視インジケーターが表示される
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('支払いを監視中...')).toBeInTheDocument();
    });

    it('should not display monitoring indicator when isMonitoring is false', () => {
      // Given: Monitoring disabled
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: isMonitoring=falseでレンダリング
      render(
        <PaymentStatus
          paymentInfo={mockPaymentInfo}
          paymentStatus={paymentStatus}
          isMonitoring={false}
        />
      );

      // Then: 監視インジケーターが表示されない
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

  });

  describe('Amount formatting', () => {
    it('should format large amounts with commas', () => {
      // Given: 大きな金額のPaymentInfo
      const largeAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1000000
      };
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={largeAmountPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 金額がカンマ区切りで表示される
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    });

    it('should format small amounts correctly', () => {
      // Given: 小さな金額のPaymentInfo
      const smallAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1
      };
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={smallAmountPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 小さな金額が正しく表示される
      expect(screen.getByText('¥1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: 適切な見出し構造になっている
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('決済状況');
    });

    it('should provide accessible status information', () => {
      // Given: COMPLETED status
      const paymentStatus: PaymentStatusType = {
        status: 'COMPLETED',
        acceptedAt: '2023-12-01T10:30:00.000Z'
      };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: ステータス情報がアクセシブル
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('支払い完了');
      expect(badge).toHaveClass('text-green-600');
      expect(badge).toHaveAttribute('aria-label', '決済状況: 支払い完了');
    });

    it('should have proper aria labels', () => {
      // Given: PaymentStatus data
      const paymentStatus: PaymentStatusType = { status: 'CREATED' };

      // When: PaymentStatusをレンダリング
      render(<PaymentStatus paymentInfo={mockPaymentInfo} paymentStatus={paymentStatus} />);

      // Then: aria-labelが適切に設定されている
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', '決済状況');
      expect(screen.getByLabelText('金額 1,000円')).toBeInTheDocument();
    });
  });
});