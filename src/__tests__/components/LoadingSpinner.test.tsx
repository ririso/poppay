/**
 * LoadingSpinnerコンポーネントのテスト
 * 重複SVGコードの共通化後の振る舞い確認
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// LoadingSpinnerコンポーネントのインポート
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Basic rendering', () => {
    it('should render loading spinner with default props', () => {
      // Given: デフォルトプロパティ
      // When: LoadingSpinnerをレンダリング
      render(<LoadingSpinner />);

      // Then: スピナーが表示される
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', '読み込み中');
    });

    it('should render with custom text label', () => {
      // Given: カスタムテキスト
      const customText = "生成中...";

      // When: テキスト付きでレンダリング
      render(<LoadingSpinner text={customText} />);

      // Then: カスタムテキストが表示される
      expect(screen.getByText(customText)).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('aria-label', customText);
    });

    it('should render without text when not provided', () => {
      // Given: テキストなし
      // When: LoadingSpinnerをレンダリング
      render(<LoadingSpinner />);

      // Then: テキストスパンが存在しない
      const spinner = screen.getByTestId('loading-spinner');
      const textElement = spinner.querySelector('span');
      expect(textElement).toBeNull();
    });
  });

  describe('Size variants', () => {
    it('should render small size spinner', () => {
      // Given: small サイズ
      // When: small サイズでレンダリング
      render(<LoadingSpinner size="small" />);

      // Then: 小さいサイズのクラスが適用される
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('should render medium size spinner by default', () => {
      // Given: サイズ指定なし（デフォルト）
      // When: LoadingSpinnerをレンダリング
      render(<LoadingSpinner />);

      // Then: 中サイズのクラスが適用される
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toHaveClass('h-5', 'w-5');
    });

    it('should render large size spinner', () => {
      // Given: large サイズ
      // When: large サイズでレンダリング
      render(<LoadingSpinner size="large" />);

      // Then: 大きいサイズのクラスが適用される
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Color customization', () => {
    it('should apply default blue color', () => {
      // Given: カラー指定なし
      // When: LoadingSpinnerをレンダリング
      render(<LoadingSpinner />);

      // Then: デフォルトの青色クラスが適用される
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('should apply custom color', () => {
      // Given: カスタムカラー
      const customColor = "text-green-600";

      // When: カスタムカラーでレンダリング
      render(<LoadingSpinner color={customColor} />);

      // Then: カスタムカラークラスが適用される
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('text-green-600');
    });
  });

  describe('Animation and SVG structure', () => {
    it('should have spinning animation class', () => {
      // Given: LoadingSpinner
      // When: レンダリング
      render(<LoadingSpinner />);

      // Then: アニメーションクラスが適用される
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should have correct SVG structure', () => {
      // Given: LoadingSpinner
      // When: レンダリング
      render(<LoadingSpinner />);

      // Then: SVG構造が正しい
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');

      // CircleとPathが存在する
      const circle = svg?.querySelector('circle');
      const path = svg?.querySelector('path');
      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
    });

    it('should have proper opacity classes for visual effect', () => {
      // Given: LoadingSpinner
      // When: レンダリング
      render(<LoadingSpinner />);

      // Then: 適切な透明度クラスが設定される
      const circle = screen.getByTestId('loading-spinner').querySelector('circle');
      const path = screen.getByTestId('loading-spinner').querySelector('path');

      expect(circle).toHaveClass('opacity-25');
      expect(path).toHaveClass('opacity-75');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // Given: LoadingSpinner
      // When: レンダリング
      render(<LoadingSpinner />);

      // Then: 適切なARIA属性が設定される
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label');
    });

    it('should use custom text as aria-label', () => {
      // Given: カスタムテキスト
      const customText = "支払いを監視中...";

      // When: カスタムテキスト付きでレンダリング
      render(<LoadingSpinner text={customText} />);

      // Then: カスタムテキストがaria-labelに使用される
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-label', customText);
    });

    it('should be discoverable by screen readers', () => {
      // Given: LoadingSpinner
      // When: レンダリング
      render(<LoadingSpinner text="読み込み中" />);

      // Then: スクリーンリーダーで発見可能
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('aria-label', '読み込み中');
    });
  });

  describe('Integration scenarios', () => {
    it('should work as button loading indicator', () => {
      // Given: ボタン内での使用
      // When: ボタン内にLoadingSpinnerを配置
      render(
        <button disabled>
          <LoadingSpinner size="small" text="生成中..." />
        </button>
      );

      // Then: ボタン内で正しく表示される
      const button = screen.getByRole('button');
      const spinner = screen.getByTestId('loading-spinner');
      expect(button).toContainElement(spinner);
      expect(button).toBeDisabled();
      expect(screen.getByText('生成中...')).toBeInTheDocument();
    });

    it('should work as status indicator', () => {
      // Given: ステータス表示での使用
      // When: ステータス表示でLoadingSpinnerを使用
      render(
        <div className="bg-blue-50 p-4 rounded-lg">
          <LoadingSpinner color="text-blue-600" text="支払いを監視中..." />
        </div>
      );

      // Then: ステータス表示として正しく機能する
      const spinner = screen.getByTestId('loading-spinner');
      const text = screen.getByText('支払いを監視中...');
      expect(spinner).toBeInTheDocument();
      expect(text).toBeInTheDocument();
    });
  });

  describe('Reusability across components', () => {
    it('should replace duplicate SVG in payment form', () => {
      // Given: 決済フォームでの使用
      // When: フォームローディング状態でLoadingSpinnerを使用
      render(
        <LoadingSpinner text="QRコード生成中..." />
      );

      // Then: 決済フォーム用のローディング表示として機能
      expect(screen.getByText('QRコード生成中...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('role', 'status');
    });

    it('should replace duplicate SVG in status monitoring', () => {
      // Given: 状態監視での使用
      // When: 監視状態でLoadingSpinnerを使用
      render(
        <LoadingSpinner color="text-blue-600" text="支払いを監視中..." />
      );

      // Then: 状態監視用のローディング表示として機能
      expect(screen.getByText('支払いを監視中...')).toBeInTheDocument();
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('should maintain consistent styling across usages', () => {
      // Given: 複数箇所での一貫した使用
      // When: 異なる場所で同じLoadingSpinnerを使用
      const { rerender } = render(
        <LoadingSpinner size="small" color="text-gray-600" />
      );

      const firstSpinner = screen.getByTestId('loading-spinner');
      const firstSvg = firstSpinner.querySelector('svg');

      // 別の場所での使用
      rerender(<LoadingSpinner size="small" color="text-gray-600" />);

      const secondSpinner = screen.getByTestId('loading-spinner');
      const secondSvg = secondSpinner.querySelector('svg');

      // Then: 一貫したスタイリングが適用される
      expect(firstSvg).toHaveClass('h-4', 'w-4', 'animate-spin');
      expect(secondSvg).toHaveClass('h-4', 'w-4', 'animate-spin');
      expect(firstSpinner).toHaveClass('text-gray-600');
      expect(secondSpinner).toHaveClass('text-gray-600');
    });
  });
});