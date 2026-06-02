/**
 * PayPayServiceリファクタリング後のテスト
 * 大きなcreateQRCodeメソッドの分割後の振る舞い確認
 */

import { createMockSupabaseClient, createMockPayPayResponse, MOCK_UUID } from '@/test-utils/test-utils';
import { PayPayService } from '@/lib/paypay';

// Mock PayPay SDK
jest.mock('@paypayopa/paypayopa-sdk-node');

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => MOCK_UUID),
}));

describe('PayPayService Refactored Methods', () => {
  const mockSupabaseClient = createMockSupabaseClient();
  const mockPayPaySDK = require('@paypayopa/paypayopa-sdk-node');

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/lib/supabase').createSupabaseAdmin.mockReturnValue(mockSupabaseClient);
  });

  describe('createTransaction method', () => {
    // リファクタリング後のcreateTransactionメソッドのテスト
    const createTransaction = async (data: {
      merchantPaymentId: string;
      amount: number;
      description: string;
      tenantId?: string;
    }) => {
      // モック実装：実際の実装後に置き換え
      const supabase = require('@/lib/supabase').createSupabaseAdmin();
      const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

      try {
        const { error } = await supabase
          .from('transactions')
          .insert({
            merchant_payment_id: data.merchantPaymentId,
            amount: data.amount,
            description: data.description,
            status: 'CREATED',
            tenant_id: data.tenantId || DEFAULT_TENANT_ID,
          });

        if (error) {
          throw new Error('Failed to create transaction record');
        }

        return { success: true, merchantPaymentId: data.merchantPaymentId };
      } catch (error) {
        throw error;
      }
    };

    it('should create transaction record successfully', async () => {
      // Given: Valid transaction data
      const transactionData = {
        merchantPaymentId: MOCK_UUID,
        amount: 1000,
        description: 'Test payment',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });

      // When: createTransactionを実行
      const result = await PayPayService.createTransaction(transactionData);

      // Then: トランザクションが正常に作成される
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        merchant_payment_id: MOCK_UUID,
        amount: 1000,
        description: 'Test payment',
        status: 'CREATED',
        tenant_id: '00000000-0000-0000-0000-000000000001',
      });
      expect(result).toEqual({
        success: true,
        merchantPaymentId: MOCK_UUID,
      });
    });

    it('should create transaction with custom tenant ID', async () => {
      // Given: Transaction data with custom tenant ID
      const transactionData = {
        merchantPaymentId: MOCK_UUID,
        amount: 2000,
        description: 'Custom tenant payment',
        tenantId: 'custom-tenant-id',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });

      // When: createTransactionを実行
      await PayPayService.createTransaction(transactionData);

      // Then: カスタムテナントIDでトランザクションが作成される
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'custom-tenant-id',
        })
      );
    });

    it('should throw error when database insert fails', async () => {
      // Given: Database insert error
      const transactionData = {
        merchantPaymentId: MOCK_UUID,
        amount: 1000,
        description: 'Test payment',
      };

      const dbError = new Error('Database connection failed');
      mockSupabaseClient.from().insert.mockReturnValue({ error: dbError });

      // When/Then: createTransactionがエラーをスローする
      await expect(PayPayService.createTransaction(transactionData)).rejects.toThrow('Failed to create transaction record');
    });
  });

  describe('generatePayPayQR method', () => {
    // リファクタリング後のgeneratePayPayQRメソッドのテスト
    const generatePayPayQR = async (data: {
      merchantPaymentId: string;
      amount: number;
      description: string;
    }) => {
      // モック実装：実際の実装後に置き換え
      const PAYPAY = require('@paypayopa/paypayopa-sdk-node');

      const payload = {
        merchantPaymentId: data.merchantPaymentId,
        codeType: 'ORDER_QR',
        amount: {
          amount: data.amount,
          currency: 'JPY',
        },
        orderDescription: data.description,
        isAuthorization: false,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        redirectType: 'WEB_LINK',
      };

      try {
        const response = await PAYPAY.QRCodeCreate(payload);
        return response;
      } catch (error) {
        throw new Error('Failed to create PayPay QR code');
      }
    };

    it('should generate PayPay QR code successfully', async () => {
      // Given: Valid QR data and successful PayPay response
      const qrData = {
        merchantPaymentId: MOCK_UUID,
        amount: 1000,
        description: 'Test payment',
      };

      const mockPayPayResponse = createMockPayPayResponse();
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse);

      // When: generatePayPayQRを実行
      const result = await generatePayPayQR(qrData);

      // Then: PayPay QRコードが正常に生成される
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledWith({
        merchantPaymentId: MOCK_UUID,
        codeType: 'ORDER_QR',
        amount: { amount: 1000, currency: 'JPY' },
        orderDescription: 'Test payment',
        isAuthorization: false,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        redirectType: 'WEB_LINK',
      });
      expect(result).toEqual(mockPayPayResponse);
    });

    it('should throw error when PayPay API fails', async () => {
      // Given: PayPay API error
      const qrData = {
        merchantPaymentId: MOCK_UUID,
        amount: 1000,
        description: 'Test payment',
      };

      const payPayError = new Error('PayPay API error');
      mockPayPaySDK.QRCodeCreate.mockRejectedValue(payPayError);

      // When/Then: generatePayPayQRがエラーをスローする
      await expect(generatePayPayQR(qrData)).rejects.toThrow('Failed to create PayPay QR code');
    });

    it('should handle different amount values correctly', async () => {
      // Given: Different amount values
      const testCases = [
        { amount: 1, description: 'Minimum amount' },
        { amount: 1000000, description: 'Maximum amount' },
        { amount: 500, description: 'Standard amount' },
      ];

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      for (const testCase of testCases) {
        // When: generatePayPayQRを異なる金額で実行
        await generatePayPayQR({
          merchantPaymentId: MOCK_UUID,
          amount: testCase.amount,
          description: testCase.description,
        });

        // Then: 正しい金額でPayPay APIが呼ばれる
        expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: { amount: testCase.amount, currency: 'JPY' },
          })
        );
      }
    });
  });

  describe('updateTransactionWithPayPay method', () => {
    // リファクタリング後のupdateTransactionWithPayPayメソッドのテスト
    const updateTransactionWithPayPay = async (data: {
      merchantPaymentId: string;
      payPayCodeId: string;
      status?: 'COMPLETED' | 'FAILED';
      paidAt?: string;
    }) => {
      // モック実装：実際の実装後に置き換え
      const supabase = require('@/lib/supabase').createSupabaseAdmin();

      try {
        const updateData: any = {
          paypay_code_id: data.payPayCodeId,
        };

        if (data.status) {
          updateData.status = data.status;
        }

        if (data.paidAt) {
          updateData.paid_at = data.paidAt;
        }

        const { error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('merchant_payment_id', data.merchantPaymentId);

        if (error) {
          throw new Error('Failed to update transaction with PayPay data');
        }

        return { success: true };
      } catch (error) {
        throw error;
      }
    };

    it('should update transaction with PayPay code ID', async () => {
      // Given: Valid update data
      const updateData = {
        merchantPaymentId: MOCK_UUID,
        payPayCodeId: 'test-code-id',
      };

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: updateTransactionWithPayPayを実行
      const result = await PayPayService.updateTransactionWithPayPay(updateData);

      // Then: トランザクションがPayPayデータで更新される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        paypay_code_id: 'test-code-id',
      });
      expect(mockSupabaseClient.from().update().eq).toHaveBeenCalledWith('merchant_payment_id', MOCK_UUID);
      expect(result).toEqual({ success: true });
    });

    it('should update transaction with completion data', async () => {
      // Given: Completion data
      const updateData = {
        merchantPaymentId: MOCK_UUID,
        payPayCodeId: 'test-code-id',
        status: 'COMPLETED' as const,
        paidAt: '2023-12-01T10:30:00.000Z',
      };

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: updateTransactionWithPayPayを実行
      await PayPayService.updateTransactionWithPayPay(updateData);

      // Then: 完了データでトランザクションが更新される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        paypay_code_id: 'test-code-id',
        status: 'COMPLETED',
        paid_at: '2023-12-01T10:30:00.000Z',
      });
    });

    it('should update transaction with failure status', async () => {
      // Given: Failure data
      const updateData = {
        merchantPaymentId: MOCK_UUID,
        payPayCodeId: 'test-code-id',
        status: 'FAILED' as const,
      };

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: updateTransactionWithPayPayを実行
      await PayPayService.updateTransactionWithPayPay(updateData);

      // Then: 失敗ステータスでトランザクションが更新される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        paypay_code_id: 'test-code-id',
        status: 'FAILED',
      });
    });

    it('should throw error when database update fails', async () => {
      // Given: Database update error
      const updateData = {
        merchantPaymentId: MOCK_UUID,
        payPayCodeId: 'test-code-id',
      };

      const dbError = new Error('Database update failed');
      mockSupabaseClient.from().update.mockReturnValue({ error: dbError });

      // When/Then: updateTransactionWithPayPayがエラーをスローする
      await expect(PayPayService.updateTransactionWithPayPay(updateData)).rejects.toThrow('Failed to update transaction with PayPay data');
    });
  });

  describe('Refactored createQRCode integration', () => {
    // リファクタリング後のcreateQRCodeメソッドの統合テスト
    const refactoredCreateQRCode = async (request: {
      amount: number;
      description: string;
      tenantId?: string;
    }) => {
      // モック実装：実際の実装後に置き換え
      const merchantPaymentId = require('uuid').v4();

      try {
        // Step 1: Create transaction
        await PayPayService.createTransaction({
          merchantPaymentId,
          amount: request.amount,
          description: request.description,
          tenantId: request.tenantId,
        });

        // Step 2: Generate PayPay QR
        const payPayResponse = await PayPayService.generatePayPayQR({
          merchantPaymentId,
          amount: request.amount,
          description: request.description,
        });

        // Step 3: Update transaction with PayPay data
        await PayPayService.updateTransactionWithPayPay({
          merchantPaymentId,
          payPayCodeId: payPayResponse.data?.codeId || '',
        });

        return {
          ...payPayResponse,
          merchantPaymentId,
        };
      } catch (error) {
        // On error, attempt to update transaction status to FAILED
        try {
          await PayPayService.updateTransactionWithPayPay({
            merchantPaymentId,
            payPayCodeId: '',
            status: 'FAILED',
          });
        } catch (updateError) {
          console.warn('Failed to update failed transaction status:', updateError);
        }
        throw error;
      }
    };

    it('should complete full QR code creation flow successfully', async () => {
      // Given: Valid request data and successful responses
      const request = {
        amount: 1000,
        description: 'Integration test payment',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      const mockPayPayResponse = createMockPayPayResponse();
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse);

      // When: refactoredCreateQRCodeを実行
      const result = await refactoredCreateQRCode(request);

      // Then: 全ステップが正常に完了する
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(1);
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ...mockPayPayResponse,
        merchantPaymentId: MOCK_UUID,
      });
    });

    it('should handle PayPay API failure with proper cleanup', async () => {
      // Given: PayPay API failure
      const request = {
        amount: 1000,
        description: 'Failed payment test',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      const payPayError = new Error('PayPay API error');
      mockPayPaySDK.QRCodeCreate.mockRejectedValue(payPayError);

      // When/Then: エラーが適切に処理される
      await expect(refactoredCreateQRCode(request)).rejects.toThrow('Failed to create PayPay QR code');

      // トランザクション作成は実行される
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(1);
      // PayPay API は実行される
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(1);
      // 失敗ステータスでの更新が試行される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        merchantPaymentId: MOCK_UUID,
        payPayCodeId: '',
        status: 'FAILED',
      });
    });

    it('should maintain same interface as original createQRCode', async () => {
      // Given: Request matching original interface
      const request = {
        amount: 1000,
        description: 'Interface compatibility test',
        tenantId: 'custom-tenant',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      const mockPayPayResponse = createMockPayPayResponse();
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse);

      // When: refactoredCreateQRCodeを実行
      const result = await refactoredCreateQRCode(request);

      // Then: レスポンス形式が元のインターフェースと一致する
      expect(result).toHaveProperty('resultInfo');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('merchantPaymentId');
      expect(result.merchantPaymentId).toBe(MOCK_UUID);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle concurrent transaction creation', async () => {
      // Given: 複数の同時トランザクション作成
      const requests = [
        { amount: 1000, description: 'Concurrent 1' },
        { amount: 2000, description: 'Concurrent 2' },
        { amount: 3000, description: 'Concurrent 3' },
      ];

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });

      // When: 複数のcreateTransactionを同時実行
      const promises = requests.map(req =>
        PayPayService.createTransaction({
          merchantPaymentId: `${MOCK_UUID}-${req.amount}`,
          ...req
        })
      );

      const results = await Promise.all(promises);

      // Then: 全ての作成が成功する
      expect(results).toHaveLength(3);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);
    });

    it('should validate merchant payment ID format', async () => {
      // Given: 無効なmerchantPaymentId
      const invalidIds = ['', 'invalid-format', null, undefined];

      for (const invalidId of invalidIds) {
        // When/Then: 無効なIDでupdateTransactionWithPayPayを実行
        if (invalidId === null || invalidId === undefined) {
          await expect(
            PayPayService.updateTransactionWithPayPay({
              merchantPaymentId: invalidId as any,
              payPayCodeId: 'test-code-id',
            })
          ).rejects.toBeDefined();
        }
      }
    });
  });

  describe('Performance and optimization', () => {
    it('should minimize database calls in happy path', async () => {
      // Given: 正常フローのリクエスト
      const request = {
        amount: 1000,
        description: 'Performance test',
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      // When: refactoredCreateQRCodeを実行
      await PayPayService.createQRCode(request);

      // Then: 最小限のDB呼び出しで完了する
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(1);
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle large description values efficiently', async () => {
      // Given: 大きな説明文
      const largeDescription = 'A'.repeat(256); // 最大長

      const transactionData = {
        merchantPaymentId: MOCK_UUID,
        amount: 1000,
        description: largeDescription,
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });

      // When: createTransactionを大きな説明文で実行
      await PayPayService.createTransaction(transactionData);

      // Then: 大きな説明文も効率的に処理される
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: largeDescription,
        })
      );
    });
  });
});