/**
 * PaymentFormコンポーネントのテスト
 * page.tsxからのフォーム処理部分の分割後の振る舞い確認
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// PaymentFormコンポーネントのインターフェース
interface PaymentFormProps {
  onSubmit: (data: { amount: number; description?: string }) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onReset?: () => void;
}

// モック：実装前はコンポーネントをモック
const MockPaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
  onReset
}) => {
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);

    // Validation logic (extracted from original page.tsx)
    if (!amount || numAmount <= 0) {
      setValidationError("有効な金額を入力してください");
      return;
    }

    if (numAmount > 1000000) {
      setValidationError("金額は100万円以下で入力してください");
      return;
    }

    if (!Number.isInteger(numAmount)) {
      setValidationError("金額は整数で入力してください");
      return;
    }

    setValidationError(null);
    await onSubmit({
      amount: numAmount,
      description: description || undefined
    });
  };

  const handleReset = () => {
    setAmount('');
    setDescription('');
    setValidationError(null);
    onReset?.();
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-6" data-testid="payment-form">
      {displayError && (
        <div
          className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md"
          data-testid="error-message"
        >
          <p className="text-red-800 text-sm">{displayError}</p>
        </div>
      )}

      <div>
        <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
          金額 (円) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setValidationError(null);
          }}
          placeholder="例: 500"
          min="1"
          max="1000000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          1円〜100万円の整数を入力してください
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
          説明文 <span className="text-gray-400">(任意)</span>
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: 30分延長料金"
          maxLength={256}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !amount}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
        data-testid="submit-button"
      >
        {isLoading ? (
          <span className="flex items-center justify-center" data-testid="loading-text">
            生成中...
          </span>
        ) : (
          "QRコード生成"
        )}
      </button>

      {onReset && (
        <button
          onClick={handleReset}
          className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          data-testid="reset-button"
        >
          新しい決済を作成
        </button>
      )}
    </div>
  );
};

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form rendering', () => {
    it('should render all form elements', () => {
      // Given: PaymentForm
      // When: フォームをレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: 全フォーム要素が表示される
      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/金額/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明文/)).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should render required field indicator', () => {
      // Given: PaymentForm
      // When: フォームをレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: 必須フィールドマークが表示される
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render placeholders and help text', () => {
      // Given: PaymentForm
      // When: フォームをレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: プレースホルダーとヘルプテキストが表示される
      expect(screen.getByPlaceholderText('例: 500')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('例: 30分延長料金')).toBeInTheDocument();
      expect(screen.getByText('1円〜100万円の整数を入力してください')).toBeInTheDocument();
    });
  });

  describe('Form input handling', () => {
    it('should update amount field value', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 金額を入力
      const amountInput = screen.getByLabelText(/金額/);
      await user.type(amountInput, '1000');

      // Then: 金額フィールドが更新される
      expect(amountInput).toHaveValue(1000);
    });

    it('should update description field value', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 説明を入力
      const descriptionInput = screen.getByLabelText(/説明文/);
      await user.type(descriptionInput, '30分延長料金');

      // Then: 説明フィールドが更新される
      expect(descriptionInput).toHaveValue('30分延長料金');
    });

    it('should enable submit button when amount is provided', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 金額を入力
      const amountInput = screen.getByLabelText(/金額/);
      await user.type(amountInput, '1000');

      // Then: 送信ボタンが有効になる
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when amount is empty', () => {
      // Given: PaymentForm（金額なし）
      // When: フォームをレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: 送信ボタンが無効
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form validation', () => {
    it('should show error for empty amount', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 空の金額で送信
      const submitButton = screen.getByTestId('submit-button');
      const amountInput = screen.getByLabelText(/金額/);

      await user.type(amountInput, '0');
      await user.click(submitButton);

      // Then: バリデーションエラーが表示される
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('有効な金額を入力してください')).toBeInTheDocument();
    });

    it('should show error for amount over limit', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 制限を超える金額で送信
      const amountInput = screen.getByLabelText(/金額/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '1000001');
      await user.click(submitButton);

      // Then: バリデーションエラーが表示される
      expect(screen.getByText('金額は100万円以下で入力してください')).toBeInTheDocument();
    });

    it('should show error for non-integer amount', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 小数点を含む金額で送信
      const amountInput = screen.getByLabelText(/金額/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '100.50');
      await user.click(submitButton);

      // Then: バリデーションエラーが表示される
      expect(screen.getByText('金額は整数で入力してください')).toBeInTheDocument();
    });

    it('should clear validation error on input change', async () => {
      // Given: バリデーションエラーがある状態
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      const amountInput = screen.getByLabelText(/金額/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '0');
      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      // When: 入力を変更
      await user.clear(amountInput);
      await user.type(amountInput, '1000');

      // Then: バリデーションエラーがクリアされる
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with correct data', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 有効なデータで送信
      const amountInput = screen.getByLabelText(/金額/);
      const descriptionInput = screen.getByLabelText(/説明文/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '1000');
      await user.type(descriptionInput, '延長料金');
      await user.click(submitButton);

      // Then: 正しいデータでonSubmitが呼ばれる
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          amount: 1000,
          description: '延長料金'
        });
      });
    });

    it('should submit without description when not provided', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // When: 説明なしで送信
      const amountInput = screen.getByLabelText(/金額/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '500');
      await user.click(submitButton);

      // Then: 説明なしでonSubmitが呼ばれる
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          amount: 500,
          description: undefined
        });
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading state when isLoading is true', () => {
      // Given: ローディング状態のPaymentForm
      // When: isLoading=trueでレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} isLoading={true} />);

      // Then: ローディング表示になる
      expect(screen.getByTestId('loading-text')).toBeInTheDocument();
      expect(screen.getByText('生成中...')).toBeInTheDocument();
    });

    it('should disable form fields during loading', () => {
      // Given: ローディング状態のPaymentForm
      // When: isLoading=trueでレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} isLoading={true} />);

      // Then: フォームフィールドが無効になる
      const amountInput = screen.getByLabelText(/金額/);
      const descriptionInput = screen.getByLabelText(/説明文/);
      const submitButton = screen.getByTestId('submit-button');

      expect(amountInput).toBeDisabled();
      expect(descriptionInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should display external error message', () => {
      // Given: エラーのあるPaymentForm
      const errorMessage = "QRコードの生成に失敗しました";

      // When: エラー付きでレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} error={errorMessage} />);

      // Then: エラーメッセージが表示される
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should prioritize external error over validation error', async () => {
      // Given: 外部エラーとバリデーションエラーの両方がある場合
      const user = userEvent.setup();
      const externalError = "サーバーエラー";
      render(<MockPaymentForm onSubmit={mockOnSubmit} error={externalError} />);

      // When: バリデーションエラーを発生させる
      const amountInput = screen.getByLabelText(/金額/);
      const submitButton = screen.getByTestId('submit-button');

      await user.type(amountInput, '0');
      await user.click(submitButton);

      // Then: 外部エラーが優先される
      expect(screen.getByText(externalError)).toBeInTheDocument();
    });
  });

  describe('Reset functionality', () => {
    it('should render reset button when onReset is provided', () => {
      // Given: onResetコールバック付きのPaymentForm
      // When: onReset付きでレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} onReset={mockOnReset} />);

      // Then: リセットボタンが表示される
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('should not render reset button when onReset is not provided', () => {
      // Given: onResetなしのPaymentForm
      // When: onResetなしでレンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: リセットボタンが表示されない
      expect(screen.queryByTestId('reset-button')).not.toBeInTheDocument();
    });

    it('should clear form data on reset', async () => {
      // Given: データの入ったPaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} onReset={mockOnReset} />);

      const amountInput = screen.getByLabelText(/金額/);
      const descriptionInput = screen.getByLabelText(/説明文/);
      const resetButton = screen.getByTestId('reset-button');

      await user.type(amountInput, '1000');
      await user.type(descriptionInput, 'test');

      // When: リセットボタンをクリック
      await user.click(resetButton);

      // Then: フォームデータがクリアされる
      expect(amountInput).toHaveValue(null);
      expect(descriptionInput).toHaveValue('');
      expect(mockOnReset).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      // Given: PaymentForm
      // When: レンダリング
      render(<MockPaymentForm onSubmit={mockOnSubmit} />);

      // Then: 適切なラベルが設定される
      const amountInput = screen.getByLabelText(/金額/);
      const descriptionInput = screen.getByLabelText(/説明文/);

      expect(amountInput).toHaveAttribute('id', 'amount');
      expect(descriptionInput).toHaveAttribute('id', 'description');
    });

    it('should be keyboard navigable', async () => {
      // Given: PaymentForm
      const user = userEvent.setup();
      render(<MockPaymentForm onSubmit={mockOnSubmit} onReset={mockOnReset} />);

      // When: Tab キーで移動
      await user.tab();

      // Then: フォーカスが適切に移動する
      expect(screen.getByLabelText(/金額/)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/説明文/)).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('submit-button')).toHaveFocus();
    });
  });
});