"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { validateCreatePayment, isZodError, formatZodError } from "@/lib/validations";
import { errorUtils } from "@/lib/client-error-handler";

/**
 * PaymentFormコンポーネントのProps型定義
 */
export interface PaymentFormProps {
  /** フォーム送信時の処理 */
  onSubmit: (data: { amount: number; description?: string }) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** フォームリセット時の処理 */
  onReset?: () => void;
}

/**
 * フォームデータの型定義
 */
interface FormData {
  amount: string;
  description: string;
}

/**
 * バリデーションエラーの型定義
 */
interface ValidationErrors {
  amount?: string;
  description?: string;
  general?: string;
}

/**
 * 金額・説明文の入力フォームコンポーネント
 *
 * 機能:
 * - 金額入力（1円以上、100万円以下の整数）
 * - 説明文入力（任意、最大100文字）
 * - リアルタイムバリデーション
 * - エラー表示
 * - アクセシビリティ対応
 * - 新しいエラーハンドリングシステム連携
 */
export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
  onReset,
}) => {
  // フォームデータの状態
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    description: "",
  });

  // バリデーションエラーの状態
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // フォーム要素への参照
  const amountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  /**
   * 金額入力値の変更処理
   */
  const handleAmountChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, amount: value }));

    // リアルタイムバリデーション
    if (value.trim()) {
      try {
        const numAmount = parseFloat(value);
        validateCreatePayment({ amount: numAmount, description: formData.description });
        setValidationErrors(prev => ({ ...prev, amount: undefined, general: undefined }));
      } catch (err) {
        if (isZodError(err)) {
          const amountError = err.errors.find(e => e.path.includes('amount'));
          if (amountError) {
            setValidationErrors(prev => ({ ...prev, amount: amountError.message }));
          }
        }
      }
    } else {
      setValidationErrors(prev => ({ ...prev, amount: undefined }));
    }
  }, [formData.description]);

  /**
   * 説明文入力値の変更処理
   */
  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));

    // リアルタイムバリデーション
    try {
      const numAmount = formData.amount ? parseFloat(formData.amount) : 0;
      validateCreatePayment({ amount: numAmount, description: value });
      setValidationErrors(prev => ({ ...prev, description: undefined }));
    } catch (err) {
      if (isZodError(err)) {
        const descriptionError = err.errors.find(e => e.path.includes('description'));
        if (descriptionError) {
          setValidationErrors(prev => ({ ...prev, description: descriptionError.message }));
        }
      }
    }
  }, [formData.amount]);

  /**
   * フォーム送信処理
   */
  const handleSubmit = useCallback(async () => {
    try {
      // バリデーション実行
      const numAmount = parseFloat(formData.amount);
      const validatedData = validateCreatePayment({
        amount: numAmount,
        description: formData.description.trim() || undefined,
      });

      // エラーをクリア
      setValidationErrors({});

      // 送信処理を実行
      await onSubmit({
        amount: validatedData.amount,
        description: validatedData.description,
      });
    } catch (err) {
      console.error("Form submission error:", err);

      if (isZodError(err)) {
        // Zodバリデーションエラーの場合
        const newErrors: ValidationErrors = {};
        err.errors.forEach(error => {
          if (error.path.includes('amount')) {
            newErrors.amount = error.message;
          } else if (error.path.includes('description')) {
            newErrors.description = error.message;
          }
        });
        setValidationErrors(newErrors);

        // 最初のエラー項目にフォーカス
        if (newErrors.amount && amountInputRef.current) {
          amountInputRef.current.focus();
        } else if (newErrors.description && descriptionInputRef.current) {
          descriptionInputRef.current.focus();
        }
      } else {
        // その他のエラーの場合
        const wrappedError = errorUtils.wrapError(err);
        setValidationErrors({
          general: wrappedError.message,
        });
      }
    }
  }, [formData, onSubmit]);

  /**
   * フォームリセット処理
   */
  const handleReset = useCallback(() => {
    setFormData({ amount: "", description: "" });
    setValidationErrors({});
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  /**
   * Enterキーでの送信処理
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !isLoading) {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isLoading]);

  /**
   * フィールドが無効かどうかの判定
   */
  const isFieldInvalid = useCallback((field: keyof ValidationErrors) => {
    return !!(validationErrors[field] || error);
  }, [validationErrors, error]);

  /**
   * 送信ボタンが無効かどうかの判定
   */
  const isSubmitDisabled = useMemo(() => {
    return (
      isLoading ||
      !formData.amount.trim() ||
      Object.keys(validationErrors).some(key => validationErrors[key as keyof ValidationErrors])
    );
  }, [isLoading, formData.amount, validationErrors]);

  // エラー状態が変わった際の処理
  useEffect(() => {
    if (error) {
      setValidationErrors({ general: error });
    } else {
      setValidationErrors(prev => ({ ...prev, general: undefined }));
    }
  }, [error]);

  return (
    <div className="space-y-6">
      {/* 全般的なエラー表示 */}
      {(validationErrors.general || error) && (
        <div
          className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                {validationErrors.general || error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 金額入力フィールド */}
      <div className="space-y-2">
        <label
          htmlFor="payment-amount"
          className="block text-sm font-semibold text-gray-700"
        >
          金額 (円) <span className="text-red-500" aria-label="必須">*</span>
        </label>
        <input
          ref={amountInputRef}
          type="number"
          id="payment-amount"
          name="amount"
          value={formData.amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 500"
          min="1"
          max="1000000"
          step="1"
          className={`
            w-full px-4 py-3 border rounded-lg shadow-sm text-lg transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${isFieldInvalid('amount')
              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
            }
          `}
          disabled={isLoading}
          aria-invalid={isFieldInvalid('amount')}
          aria-describedby={
            validationErrors.amount
              ? "amount-error amount-help"
              : "amount-help"
          }
          aria-required="true"
          autoComplete="off"
        />

        {/* 金額フィールドのエラー表示 */}
        {validationErrors.amount && (
          <div
            id="amount-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {validationErrors.amount}
          </div>
        )}

        {/* 金額フィールドのヘルプテキスト */}
        <p id="amount-help" className="text-xs text-gray-500">
          1円〜100万円の整数を入力してください
        </p>
      </div>

      {/* 説明文入力フィールド */}
      <div className="space-y-2">
        <label
          htmlFor="payment-description"
          className="block text-sm font-semibold text-gray-700"
        >
          説明文 <span className="text-gray-400">(任意)</span>
        </label>
        <input
          ref={descriptionInputRef}
          type="text"
          id="payment-description"
          name="description"
          value={formData.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 30分延長料金"
          maxLength={100}
          className={`
            w-full px-4 py-3 border rounded-lg shadow-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${isFieldInvalid('description')
              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
            }
          `}
          disabled={isLoading}
          aria-invalid={isFieldInvalid('description')}
          aria-describedby={
            validationErrors.description
              ? "description-error description-help"
              : "description-help"
          }
          autoComplete="off"
        />

        {/* 説明文フィールドのエラー表示 */}
        {validationErrors.description && (
          <div
            id="description-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {validationErrors.description}
          </div>
        )}

        {/* 説明文フィールドのヘルプテキスト */}
        <p id="description-help" className="text-xs text-gray-500">
          最大100文字まで入力できます。現在: {formData.description.length}文字
        </p>
      </div>

      {/* 送信ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className="
          w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6
          rounded-lg font-semibold shadow-lg transition-all duration-200
          hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          disabled:hover:from-blue-600 disabled:hover:to-purple-600
        "
        aria-describedby="submit-help"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            <span aria-live="polite">QRコードを生成中...</span>
          </span>
        ) : (
          "QRコード生成"
        )}
      </button>

      {/* 送信ボタンのヘルプテキスト */}
      {isSubmitDisabled && !isLoading && (
        <p id="submit-help" className="text-xs text-gray-500 text-center">
          {!formData.amount.trim()
            ? "金額を入力してください"
            : "入力内容を確認してください"
          }
        </p>
      )}

      {/* リセットボタン（onResetが提供されている場合のみ表示） */}
      {onReset && (
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="
            w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold
            transition-colors hover:bg-gray-200
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          フォームをリセット
        </button>
      )}
    </div>
  );
};

export default PaymentForm;