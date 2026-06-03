import React from 'react';

export interface LoadingSpinnerProps {
  /** 表示するテキスト（任意） */
  text?: string;
  /** スピナーのサイズ */
  size?: 'small' | 'medium' | 'large';
  /** スピナーの色 */
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text,
  size = 'medium',
  color = 'text-blue-600'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-4 w-4';
      case 'large':
        return 'h-6 w-6';
      default:
        return 'h-5 w-5';
    }
  };

  return (
    <div
      className={`flex items-center ${color}`}
      data-testid="loading-spinner"
      role="status"
      aria-label={text || "読み込み中"}
    >
      <svg
        className={`animate-spin ${getSizeClasses()} ${text ? 'mr-3' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
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
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
};