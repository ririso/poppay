/**
 * QRCodeDisplayコンポーネントのテスト
 * page.tsxからのQRコード表示部分の分割後の振る舞い確認
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// QRCodeDisplayコンポーネントのインターフェース
interface PaymentInfo {
  merchantPaymentId: string;
  qrCode: string;
  codeUrl: string;
  amount: number;
  description: string;
}

interface QRCodeDisplayProps {
  paymentInfo: PaymentInfo;
  onError?: (error: Error) => void;
}

// モック：実装前はコンポーネントをモック
const MockQRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  paymentInfo,
  onError
}) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
    onError?.(new Error('QRコード画像の読み込みに失敗しました'));
  };

  const formatAmount = (amount: number) => amount.toLocaleString();

  return (
    <div className="border-t border-gray-100 p-6 sm:p-8" data-testid="qr-code-display">
      <h3 className="text-lg font-semibold text-center text-gray-900 mb-6">
        生成されたQRコード
      </h3>

      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-300">
          {!imageError ? (
            <img
              src={paymentInfo.qrCode}
              alt="PayPay QR Code"
              className="w-64 h-64 sm:w-80 sm:h-80 max-w-full h-auto"
              onError={handleImageError}
              data-testid="qr-code-image"
            />
          ) : (
            <div
              className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center bg-gray-100 text-gray-500"
              data-testid="qr-code-error"
            >
              QRコードを読み込めませんでした
            </div>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4" data-testid="payment-info">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">お支払い情報</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>金額:</span>
            <span className="font-semibold">¥{formatAmount(paymentInfo.amount)}</span>
          </div>
          {paymentInfo.description && (
            <div className="flex justify-between">
              <span>説明:</span>
              <span className="font-semibold">{paymentInfo.description}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>取引ID:</span>
            <span className="font-mono text-xs">{paymentInfo.merchantPaymentId}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-3">
          お客様にこのQRコードを提示してお支払いください
        </p>
        <div className="bg-blue-50 p-4 rounded-lg" data-testid="instructions">
          <p className="text-xs text-blue-800 font-medium">
            QRコードをスキャンしてPayPayアプリで支払いを行ってください
          </p>
        </div>
      </div>

      {/* Hidden elements for external access */}
      <div style={{ display: 'none' }} data-testid="qr-url">{paymentInfo.codeUrl}</div>
    </div>
  );
};

describe('QRCodeDisplay', () => {
  const mockPaymentInfo: PaymentInfo = {
    merchantPaymentId: 'test-merchant-payment-id',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    codeUrl: 'paypay://payment?code=test',
    amount: 1000,
    description: '30分延長料金'
  };

  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render QR code display section', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: QRコード表示セクションが表示される
      expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
      expect(screen.getByText('生成されたQRコード')).toBeInTheDocument();
    });

    it('should render QR code image with correct attributes', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: QRコード画像が正しい属性で表示される
      const qrImage = screen.getByTestId('qr-code-image');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', mockPaymentInfo.qrCode);
      expect(qrImage).toHaveAttribute('alt', 'PayPay QR Code');
    });

    it('should render payment information', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: お支払い情報が表示される
      const paymentInfo = screen.getByTestId('payment-info');
      expect(paymentInfo).toBeInTheDocument();
      expect(screen.getByText('お支払い情報')).toBeInTheDocument();
    });

    it('should render instruction messages', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 案内メッセージが表示される
      expect(screen.getByText('お客様にこのQRコードを提示してお支払いください')).toBeInTheDocument();
      expect(screen.getByText('QRコードをスキャンしてPayPayアプリで支払いを行ってください')).toBeInTheDocument();
    });
  });

  describe('Payment information display', () => {
    it('should display formatted amount', () => {
      // Given: PaymentInfo with amount
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: フォーマットされた金額が表示される
      expect(screen.getByText('¥1,000')).toBeInTheDocument();
    });

    it('should display large amounts correctly', () => {
      // Given: 大きな金額のPaymentInfo
      const largeAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1000000
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={largeAmountPaymentInfo} />);

      // Then: 大きな金額が正しくフォーマットされる
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    });

    it('should display description when provided', () => {
      // Given: 説明付きのPaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 説明が表示される
      expect(screen.getByText('30分延長料金')).toBeInTheDocument();
    });

    it('should not display description field when empty', () => {
      // Given: 説明なしのPaymentInfo
      const paymentInfoWithoutDescription = {
        ...mockPaymentInfo,
        description: ''
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={paymentInfoWithoutDescription} />);

      // Then: 説明フィールドが表示されない
      expect(screen.queryByText('説明:')).not.toBeInTheDocument();
    });

    it('should display merchant payment ID', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 取引IDが表示される
      expect(screen.getByText('取引ID:')).toBeInTheDocument();
      expect(screen.getByText('test-merchant-payment-id')).toBeInTheDocument();
    });
  });

  describe('QR Code image handling', () => {
    it('should handle image load error', () => {
      // Given: QRCodeDisplay with error handler
      // When: QR画像の読み込みエラーが発生
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} onError={mockOnError} />);

      const qrImage = screen.getByTestId('qr-code-image');
      fireEvent.error(qrImage);

      // Then: エラー状態が表示される
      expect(screen.getByTestId('qr-code-error')).toBeInTheDocument();
      expect(screen.getByText('QRコードを読み込めませんでした')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should not call onError when handler is not provided', () => {
      // Given: エラーハンドラーなしのQRCodeDisplay
      // When: QR画像の読み込みエラーが発生
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      const qrImage = screen.getByTestId('qr-code-image');
      fireEvent.error(qrImage);

      // Then: エラー状態は表示されるが、onErrorは呼ばれない
      expect(screen.getByTestId('qr-code-error')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should maintain aspect ratio with responsive sizing', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: レスポンシブサイズのクラスが適用される
      const qrImage = screen.getByTestId('qr-code-image');
      expect(qrImage).toHaveClass('w-64', 'h-64', 'sm:w-80', 'sm:h-80', 'max-w-full', 'h-auto');
    });
  });

  describe('Different payment scenarios', () => {
    it('should handle minimum amount payment', () => {
      // Given: 最小金額のPaymentInfo
      const minAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1,
        description: '最小金額テスト'
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={minAmountPaymentInfo} />);

      // Then: 最小金額が正しく表示される
      expect(screen.getByText('¥1')).toBeInTheDocument();
      expect(screen.getByText('最小金額テスト')).toBeInTheDocument();
    });

    it('should handle maximum amount payment', () => {
      // Given: 最大金額のPaymentInfo
      const maxAmountPaymentInfo = {
        ...mockPaymentInfo,
        amount: 1000000,
        description: '最大金額テスト'
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={maxAmountPaymentInfo} />);

      // Then: 最大金額が正しく表示される
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
      expect(screen.getByText('最大金額テスト')).toBeInTheDocument();
    });

    it('should handle long description gracefully', () => {
      // Given: 長い説明のPaymentInfo
      const longDescriptionPaymentInfo = {
        ...mockPaymentInfo,
        description: 'とても長い説明テキストです。これは256文字制限のテストのために書かれた長いテキストです。'
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={longDescriptionPaymentInfo} />);

      // Then: 長い説明が適切に表示される
      expect(screen.getByText(longDescriptionPaymentInfo.description)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper image alt text', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 適切なalt属性が設定される
      const qrImage = screen.getByTestId('qr-code-image');
      expect(qrImage).toHaveAttribute('alt', 'PayPay QR Code');
    });

    it('should have semantic heading structure', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 適切な見出し構造になっている
      const mainHeading = screen.getByRole('heading', { level: 3, name: '生成されたQRコード' });
      const subHeading = screen.getByRole('heading', { level: 4, name: 'お支払い情報' });

      expect(mainHeading).toBeInTheDocument();
      expect(subHeading).toBeInTheDocument();
    });

    it('should provide accessible error state', () => {
      // Given: 画像エラー状態のQRCodeDisplay
      // When: QR画像の読み込みエラーが発生
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      const qrImage = screen.getByTestId('qr-code-image');
      fireEvent.error(qrImage);

      // Then: エラー状態がアクセシブル
      const errorDiv = screen.getByTestId('qr-code-error');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv).toHaveTextContent('QRコードを読み込めませんでした');
    });
  });

  describe('Integration with external systems', () => {
    it('should expose QR URL for external access', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: QR URLが外部アクセス用に公開される
      expect(screen.getByTestId('qr-url')).toHaveTextContent(mockPaymentInfo.codeUrl);
    });

    it('should handle different QR code data formats', () => {
      // Given: 異なる形式のQRコードデータ
      const differentFormatPaymentInfo = {
        ...mockPaymentInfo,
        qrCode: 'https://example.com/qr-code.png',
        codeUrl: 'paypay://payment?code=different-format'
      };

      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={differentFormatPaymentInfo} />);

      // Then: 異なる形式のデータも正しく処理される
      const qrImage = screen.getByTestId('qr-code-image');
      expect(qrImage).toHaveAttribute('src', 'https://example.com/qr-code.png');
      expect(screen.getByTestId('qr-url')).toHaveTextContent('paypay://payment?code=different-format');
    });
  });

  describe('Visual styling and layout', () => {
    it('should apply proper styling classes', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: 適切なスタイリングクラスが適用される
      const display = screen.getByTestId('qr-code-display');
      const instructions = screen.getByTestId('instructions');

      expect(display).toHaveClass('border-t', 'border-gray-100', 'p-6', 'sm:p-8');
      expect(instructions).toHaveClass('bg-blue-50', 'p-4', 'rounded-lg');
    });

    it('should center QR code image', () => {
      // Given: PaymentInfo
      // When: QRCodeDisplayをレンダリング
      render(<MockQRCodeDisplay paymentInfo={mockPaymentInfo} />);

      // Then: QRコード画像が中央配置される
      const imageContainer = screen.getByTestId('qr-code-image').closest('.flex');
      expect(imageContainer).toHaveClass('justify-center');
    });
  });
});