"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { PaymentInfo } from "@/components/PaymentStatus";

interface QRCodeDisplayProps {
  paymentInfo: PaymentInfo;
  onImageError?: (error: Error) => void;
}

export default function QRCodeDisplay({ paymentInfo, onImageError }: QRCodeDisplayProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
    const error = new Error("QRコード画像の読み込みに失敗しました");
    if (onImageError) {
      onImageError(error);
    }
  }, [onImageError]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
  }, []);

  return (
    <div className="border-t border-gray-100 p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-center text-gray-900 mb-6">
        生成されたQRコード
      </h3>

      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-300 relative">
          {isLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">読み込み中...</span>
              </div>
            </div>
          )}

          {imageError ? (
            <div className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-sm">画像の読み込みに失敗しました</p>
                <p className="text-xs text-gray-400 mt-1">ページを再読み込みしてください</p>
              </div>
            </div>
          ) : (
            <Image
              src={paymentInfo.qrCode}
              alt={`PayPay決済QRコード - 金額: ¥${paymentInfo.amount.toLocaleString()}, ${paymentInfo.description}`}
              width={320}
              height={320}
              className="w-64 h-64 sm:w-80 sm:h-80 max-w-full h-auto"
              onError={handleImageError}
              onLoad={handleImageLoad}
              priority
              unoptimized // QRコードは外部URLなので最適化を無効化
            />
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-3">
          お客様にこのQRコードを提示してお支払いください
        </p>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs text-blue-800 font-medium mb-1">
                PayPayアプリでの支払い方法:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>1. PayPayアプリを開く</li>
                <li>2. 「スキャン」をタップ</li>
                <li>3. このQRコードを読み取る</li>
                <li>4. 金額を確認して支払う</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}