"use client";

import PaymentForm from "@/components/PaymentForm";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PaymentStatus from "@/components/PaymentStatus";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";


export default function AdminPage() {
  // カスタムフックを使用してビジネスロジックを統合
  const {
    paymentInfo,
    paymentStatus,
    isLoading,
    isMonitoring,
    error,
    createPayment,
    resetPayment,
  } = usePaymentFlow();


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 sm:text-4xl">
            PayPay決済管理
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            金額を入力してQRコードを生成してください
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Form Section */}
          <div className="p-6 sm:p-8">
            {!paymentInfo ? (
              <PaymentForm
                onSubmit={createPayment}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        QRコードが正常に生成されました
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetPayment}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  新しい決済を作成
                </button>
              </div>
            )}
          </div>

          {/* Status Section */}
          {paymentStatus && paymentInfo && (
            <PaymentStatus
              paymentInfo={paymentInfo}
              paymentStatus={paymentStatus}
              isMonitoring={isMonitoring}
            />
          )}

          {/* QR Code Section */}
          {paymentInfo && (
            <QRCodeDisplay
              paymentInfo={paymentInfo}
              onImageError={(error) => {
                console.error("QR Code image error:", error);
                // エラーはカスタムフック内で管理されるため、ここではログ出力のみ
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}