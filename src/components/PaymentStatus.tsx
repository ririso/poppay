"use client";

import { LoadingSpinner } from "@/components/LoadingSpinner";

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

interface PaymentStatusProps {
  paymentInfo: PaymentInfo;
  paymentStatus: PaymentStatus;
  isMonitoring?: boolean;
}

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

export default function PaymentStatus({
  paymentInfo,
  paymentStatus,
  isMonitoring = false
}: PaymentStatusProps) {
  return (
    <div
      className="border-t border-gray-100 p-6 sm:p-8 bg-gray-50"
      role="region"
      aria-label="決済状況"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">決済状況</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentStatus.status)}`}
          role="status"
          aria-label={`決済状況: ${getStatusText(paymentStatus.status)}`}
        >
          {getStatusText(paymentStatus.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>金額:</span>
          <span className="font-semibold" aria-label={`金額 ${paymentInfo.amount.toLocaleString()}円`}>
            ¥{paymentInfo.amount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>説明:</span>
          <span className="font-semibold">{paymentInfo.description}</span>
        </div>
        {paymentStatus.acceptedAt && (
          <div className="flex justify-between">
            <span>完了時刻:</span>
            <span
              className="font-semibold"
              aria-label={`完了時刻 ${new Date(paymentStatus.acceptedAt).toLocaleString("ja-JP")}`}
            >
              {new Date(paymentStatus.acceptedAt).toLocaleString("ja-JP")}
            </span>
          </div>
        )}
      </div>

      {isMonitoring && (
        <div className="mt-4" role="status" aria-live="polite">
          <LoadingSpinner
            size="small"
            color="text-blue-600"
            text="支払いを監視中..."
          />
        </div>
      )}
    </div>
  );
}

// Export types for use in other components
export type { PaymentInfo, PaymentStatus, PaymentStatusProps };