"use client";

import { useState, useEffect, useCallback } from "react";

interface PaymentInfo {
  merchantPaymentId: string;
  qrCode: string;
  codeUrl: string;
  amount: number;
  description: string;
}

interface PaymentStatus {
  status: "CREATED" | "COMPLETED" | "FAILED" | "EXPIRED";
  acceptedAt?: string;
}

export default function AdminPage() {
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setPaymentInfo(null);
    setPaymentStatus(null);
    setError(null);
    setIsMonitoring(false);
  };

  const checkPaymentStatus = useCallback(async (merchantPaymentId: string) => {
    try {
      const response = await fetch(`/api/payments/status?merchantPaymentId=${merchantPaymentId}`);
      const data = await response.json();

      if (response.ok) {
        setPaymentStatus({
          status: data.status,
          acceptedAt: data.acceptedAt,
        });

        if (data.status === "COMPLETED") {
          setIsMonitoring(false);
          return true; // Payment completed
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          setIsMonitoring(false);
          return false; // Payment failed
        }
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
    return null; // Continue monitoring
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isMonitoring && paymentInfo) {
      intervalId = setInterval(async () => {
        const result = await checkPaymentStatus(paymentInfo.merchantPaymentId);
        if (result !== null) {
          setIsMonitoring(false);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMonitoring, paymentInfo, checkPaymentStatus]);

  const generateQRCode = async () => {
    const numAmount = parseFloat(amount);

    if (!amount || numAmount <= 0) {
      setError("有効な金額を入力してください");
      return;
    }

    if (numAmount > 1000000) {
      setError("金額は100万円以下で入力してください");
      return;
    }

    if (!Number.isInteger(numAmount)) {
      setError("金額は整数で入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numAmount,
          description: description || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentInfo({
          merchantPaymentId: data.merchantPaymentId,
          qrCode: data.qrCode,
          codeUrl: data.codeUrl,
          amount: data.amount,
          description: data.description,
        });
        setPaymentStatus({ status: "CREATED" });
        setIsMonitoring(true);
      } else {
        setError(data.error || "QRコードの生成に失敗しました");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("QRコードの生成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "FAILED":
        return "text-red-600 bg-red-100";
      case "EXPIRED":
        return "text-yellow-600 bg-yellow-100";
      case "CREATED":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "支払い完了";
      case "FAILED":
        return "支払い失敗";
      case "EXPIRED":
        return "期限切れ";
      case "CREATED":
        return "支払い待ち";
      default:
        return "不明";
    }
  };

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
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
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
                    setError(null);
                  }}
                  placeholder="例: 500"
                  min="1"
                  max="1000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors"
                  disabled={isLoading || paymentInfo !== null}
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
                  disabled={isLoading || paymentInfo !== null}
                />
              </div>

              {!paymentInfo && (
                <button
                  onClick={generateQRCode}
                  disabled={isLoading || !amount}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      生成中...
                    </span>
                  ) : (
                    "QRコード生成"
                  )}
                </button>
              )}

              {paymentInfo && (
                <button
                  onClick={resetForm}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  新しい決済を作成
                </button>
              )}
            </div>
          </div>

          {/* Status Section */}
          {paymentStatus && (
            <div className="border-t border-gray-100 p-6 sm:p-8 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">決済状況</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentStatus.status)}`}>
                  {getStatusText(paymentStatus.status)}
                </span>
              </div>

              {paymentInfo && (
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>金額:</span>
                    <span className="font-semibold">¥{paymentInfo.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>説明:</span>
                    <span className="font-semibold">{paymentInfo.description}</span>
                  </div>
                  {paymentStatus.acceptedAt && (
                    <div className="flex justify-between">
                      <span>完了時刻:</span>
                      <span className="font-semibold">
                        {new Date(paymentStatus.acceptedAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {isMonitoring && (
                <div className="mt-4 flex items-center text-blue-600">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">支払いを監視中...</span>
                </div>
              )}
            </div>
          )}

          {/* QR Code Section */}
          {paymentInfo && (
            <div className="border-t border-gray-100 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-6">
                生成されたQRコード
              </h3>
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-300">
                  <img
                    src={paymentInfo.qrCode}
                    alt="PayPay QR Code"
                    className="w-64 h-64 sm:w-80 sm:h-80 max-w-full h-auto"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  お客様にこのQRコードを提示してお支払いください
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    QRコードをスキャンしてPayPayアプリで支払いを行ってください
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}