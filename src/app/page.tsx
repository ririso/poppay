"use client";

import { useState } from "react";

export default function AdminPage() {
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateQRCode = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("有効な金額を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/payments/create-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || "PayPay決済",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setQrCodeData(data.qrCode);
      } else {
        alert(`エラー: ${data.error || "QRコードの生成に失敗しました"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("QRコードの生成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            PayPay決済管理
          </h1>
          <p className="text-center text-gray-600">
            金額を入力してQRコードを生成してください
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              金額 (円) *
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 500"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              説明文
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 30分延長料金"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={generateQRCode}
            disabled={isLoading || !amount}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "生成中..." : "QRコード生成"}
          </button>
        </div>

        {qrCodeData && (
          <div className="mt-8 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <h3 className="text-lg font-medium text-center text-gray-900 mb-4">
              生成されたQRコード
            </h3>
            <div className="flex justify-center">
              <img
                src={qrCodeData}
                alt="PayPay QR Code"
                className="max-w-full h-auto"
              />
            </div>
            <p className="text-sm text-center text-gray-600 mt-4">
              お客様にこのQRコードを表示してお支払いください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}