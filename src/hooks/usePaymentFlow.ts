"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PaymentInfo } from "@/components/PaymentStatus";
import { useFormSubmission, useApiCall } from "@/hooks/use-error-handler";

interface PaymentStatusType {
  status: "CREATED" | "COMPLETED" | "FAILED" | "EXPIRED";
  acceptedAt?: string;
}

interface UsePaymentFlowReturn {
  // 状態
  paymentInfo: PaymentInfo | null;
  paymentStatus: PaymentStatusType | null;
  isLoading: boolean;
  isMonitoring: boolean;
  error: string | null;

  // アクション
  createPayment: (data: { amount: number; description?: string }) => Promise<void>;
  resetPayment: () => void;
}

/**
 * PayPay決済フローを管理するカスタムフック
 *
 * 決済作成からステータス監視までの全体的なフローを管理し、
 * エラーハンドリングとポーリング制御を統合している
 */
export function usePaymentFlow(): UsePaymentFlowReturn {
  // 状態管理
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType | null>(null);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  // エラーハンドリング統合
  const {
    loading: isLoading,
    displayInfo,
    submit: submitPayment,
    reset: resetError
  } = useFormSubmission();

  const { call: callApi } = useApiCall();

  // ポーリング制御
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 決済ステータスをチェックする関数
   */
  const checkPaymentStatus = useCallback(async (merchantPaymentId: string): Promise<boolean | null> => {
    try {
      const data = await callApi(`/api/payments/status?merchantPaymentId=${merchantPaymentId}`);

      if (data) {
        setPaymentStatus({
          status: data.status,
          acceptedAt: data.acceptedAt,
        });

        // 決済完了または失敗の場合は監視を停止
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
      // エラーが発生しても監視は継続
    }
    return null; // Continue monitoring
  }, [callApi]);

  /**
   * ポーリング制御のエフェクト
   */
  useEffect(() => {
    if (isMonitoring && paymentInfo) {
      intervalRef.current = setInterval(async () => {
        const result = await checkPaymentStatus(paymentInfo.merchantPaymentId);
        if (result !== null) {
          setIsMonitoring(false);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMonitoring, paymentInfo, checkPaymentStatus]);

  /**
   * 新しい決済を作成する関数
   */
  const createPayment = useCallback(async (data: { amount: number; description?: string }) => {
    const success = await submitPayment(async () => {
      const response = await fetch("/api/payments/create-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          description: data.description || undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "QRコードの生成に失敗しました");
      }

      return responseData;
    }, (responseData) => {
      // 成功時のコールバック
      setPaymentInfo({
        merchantPaymentId: responseData.merchantPaymentId,
        qrCode: responseData.qrCode,
        codeUrl: responseData.codeUrl,
        amount: responseData.amount,
        description: responseData.description,
      });
      setPaymentStatus({ status: "CREATED" });
      setIsMonitoring(true);
    });

    if (!success) {
      // エラーが発生した場合は監視状態をリセット
      setIsMonitoring(false);
    }
  }, [submitPayment]);

  /**
   * 決済状態をリセットする関数
   */
  const resetPayment = useCallback(() => {
    // ポーリングを停止
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 状態をリセット
    setPaymentInfo(null);
    setPaymentStatus(null);
    setIsMonitoring(false);
    resetError();
  }, [resetError]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // 状態
    paymentInfo,
    paymentStatus,
    isLoading,
    isMonitoring,
    error: displayInfo?.message || null,

    // アクション
    createPayment,
    resetPayment,
  };
}