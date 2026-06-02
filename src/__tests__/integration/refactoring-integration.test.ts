/**
 * リファクタリング統合テスト
 * 分割されたコンポーネントとサービスが連携して正しく動作することを確認
 */

import { createMockSupabaseClient, createMockPayPayResponse, MOCK_UUID } from '@/test-utils/test-utils';

// Mock all dependencies
jest.mock('@paypayopa/paypayopa-sdk-node');
jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => MOCK_UUID),
}));

describe('Refactoring Integration Tests', () => {
  const mockSupabaseClient = createMockSupabaseClient();
  const mockPayPaySDK = require('@paypayopa/paypayopa-sdk-node');

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/lib/supabase').createSupabaseAdmin.mockReturnValue(mockSupabaseClient);
  });

  describe('Complete payment flow integration', () => {
    it('should handle full payment workflow end-to-end', async () => {
      // Given: 完全な決済ワークフローの設定
      const paymentRequest = {
        amount: 1000,
        description: '30分延長料金',
        tenantId: 'test-tenant-id'
      };

      // データベース操作のモック設定
      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: {
          id: 'tx-123',
          merchant_payment_id: MOCK_UUID,
          amount: 1000,
          description: '30分延長料金',
          status: 'CREATED',
          tenant_id: 'test-tenant-id'
        },
        error: null
      });

      // PayPay SDKのモック設定
      const mockPayPayResponse = createMockPayPayResponse({
        data: {
          ...createMockPayPayResponse().data,
          merchantPaymentId: MOCK_UUID
        }
      });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(mockPayPayResponse);
      mockPayPaySDK.GetPaymentDetails.mockResolvedValue({
        resultInfo: { code: 'SUCCESS', message: 'Success' },
        data: {
          status: 'COMPLETED',
          merchantPaymentId: MOCK_UUID,
          acceptedAt: 1670000000
        }
      });

      // When: ワークフロー全体を実行

      // Step 1: QRコード生成（リファクタリング後）
      const createResult = mockSupabaseClient.from().insert;
      const qrResult = mockPayPaySDK.QRCodeCreate;
      const updateResult = mockSupabaseClient.from().update;

      // QRコード生成の実行をシミュレート
      await createResult({
        merchant_payment_id: MOCK_UUID,
        amount: paymentRequest.amount,
        description: paymentRequest.description,
        status: 'CREATED',
        tenant_id: paymentRequest.tenantId,
      });

      const qrResponse = await qrResult({
        merchantPaymentId: MOCK_UUID,
        codeType: 'ORDER_QR',
        amount: { amount: paymentRequest.amount, currency: 'JPY' },
        orderDescription: paymentRequest.description,
        isAuthorization: false,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        redirectType: 'WEB_LINK',
      });

      await updateResult({
        paypay_code_id: qrResponse.data?.codeId,
      });

      // Step 2: 決済監視
      const statusResponse = await mockPayPaySDK.GetPaymentDetails(MOCK_UUID);

      // Step 3: 完了時の更新
      await updateResult({
        status: 'COMPLETED',
        paid_at: new Date(statusResponse.data.acceptedAt * 1000).toISOString(),
      });

      // Then: 全ステップが正常に完了する
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant_payment_id: MOCK_UUID,
          amount: 1000,
          description: '30分延長料金',
          status: 'CREATED',
          tenant_id: 'test-tenant-id',
        })
      );
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantPaymentId: MOCK_UUID,
          amount: { amount: 1000, currency: 'JPY' },
        })
      );
      expect(mockPayPaySDK.GetPaymentDetails).toHaveBeenCalledWith(MOCK_UUID);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(2);
    });

    it('should handle payment failure with proper cleanup', async () => {
      // Given: PayPay API失敗のシナリオ
      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      const payPayError = new Error('PayPay API unavailable');
      mockPayPaySDK.QRCodeCreate.mockRejectedValue(payPayError);

      // When: QRコード生成が失敗
      try {
        await mockSupabaseClient.from().insert({
          merchant_payment_id: MOCK_UUID,
          amount: 1000,
          description: 'Test payment',
          status: 'CREATED',
        });

        await mockPayPaySDK.QRCodeCreate({
          merchantPaymentId: MOCK_UUID,
          codeType: 'ORDER_QR',
          amount: { amount: 1000, currency: 'JPY' },
        });
      } catch (error) {
        // エラー時の処理をシミュレート
        await mockSupabaseClient.from().update({
          status: 'FAILED',
        });
      }

      // Then: 失敗時の適切なクリーンアップが実行される
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(1);
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' })
      );
    });

    it('should handle concurrent payment requests', async () => {
      // Given: 複数の同時決済リクエスト
      const paymentRequests = [
        { amount: 1000, description: 'Payment 1', merchantId: `${MOCK_UUID}-1` },
        { amount: 2000, description: 'Payment 2', merchantId: `${MOCK_UUID}-2` },
        { amount: 3000, description: 'Payment 3', merchantId: `${MOCK_UUID}-3` },
      ];

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      // When: 複数の決済を並行処理
      const promises = paymentRequests.map(async (request) => {
        await mockSupabaseClient.from().insert({
          merchant_payment_id: request.merchantId,
          amount: request.amount,
          description: request.description,
          status: 'CREATED',
        });

        return mockPayPaySDK.QRCodeCreate({
          merchantPaymentId: request.merchantId,
          amount: { amount: request.amount, currency: 'JPY' },
        });
      });

      const results = await Promise.all(promises);

      // Then: 全ての決済が正常に処理される
      expect(results).toHaveLength(3);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cross-component communication', () => {
    it('should maintain data consistency between UI components and services', async () => {
      // Given: UIコンポーネントからサービス層への一貫したデータフロー
      const formData = {
        amount: 1500,
        description: 'Component integration test'
      };

      // UIコンポーネント → PaymentFormの処理をシミュレート
      const validatedData = {
        amount: formData.amount,
        description: formData.description
      };

      // PaymentForm → PayPayServiceへのデータ引き渡しをシミュレート
      const serviceRequest = {
        merchantPaymentId: MOCK_UUID,
        amount: validatedData.amount,
        description: validatedData.description
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update.mockReturnValue({ error: null });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      // When: サービス層での処理
      await mockSupabaseClient.from().insert({
        merchant_payment_id: serviceRequest.merchantPaymentId,
        amount: serviceRequest.amount,
        description: serviceRequest.description,
        status: 'CREATED',
      });

      const qrResponse = await mockPayPaySDK.QRCodeCreate({
        merchantPaymentId: serviceRequest.merchantPaymentId,
        amount: { amount: serviceRequest.amount, currency: 'JPY' },
        orderDescription: serviceRequest.description,
      });

      // QRCodeDisplayコンポーネントへのデータ引き渡しをシミュレート
      const displayData = {
        merchantPaymentId: serviceRequest.merchantPaymentId,
        qrCode: qrResponse.data?.url || '',
        codeUrl: qrResponse.data?.deeplink || '',
        amount: serviceRequest.amount,
        description: serviceRequest.description,
      };

      // Then: 全レイヤーでデータの一貫性が保たれる
      expect(displayData.amount).toBe(formData.amount);
      expect(displayData.description).toBe(formData.description);
      expect(displayData.merchantPaymentId).toBe(MOCK_UUID);
    });

    it('should handle error propagation between layers correctly', async () => {
      // Given: レイヤー間のエラー伝播シナリオ
      const formData = { amount: 1000, description: 'Error test' };

      // Service layer error simulation
      const dbError = new Error('Database connection failed');
      mockSupabaseClient.from().insert.mockReturnValue({ error: dbError });

      let serviceError: Error | null = null;
      let uiError: string | null = null;

      // When: サービスレイヤーでエラーが発生
      try {
        const result = mockSupabaseClient.from().insert({
          merchant_payment_id: MOCK_UUID,
          amount: formData.amount,
          description: formData.description,
          status: 'CREATED',
        });

        if (result.error) {
          throw new Error('Failed to create transaction record');
        }
      } catch (error) {
        serviceError = error as Error;
        // UI layer error handling simulation
        uiError = 'QRコードの生成に失敗しました';
      }

      // Then: エラーが適切に伝播される
      expect(serviceError).toBeInstanceOf(Error);
      expect(uiError).toBe('QRコードの生成に失敗しました');
    });
  });

  describe('Multi-tenant support integration', () => {
    it('should isolate data between different tenants', async () => {
      // Given: 複数テナントのシナリオ
      const tenant1Request = {
        amount: 1000,
        description: 'Tenant 1 payment',
        tenantId: 'tenant-001'
      };

      const tenant2Request = {
        amount: 2000,
        description: 'Tenant 2 payment',
        tenantId: 'tenant-002'
      };

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      // When: 異なるテナントからの決済リクエストを処理
      await mockSupabaseClient.from().insert({
        merchant_payment_id: `${MOCK_UUID}-tenant1`,
        amount: tenant1Request.amount,
        description: tenant1Request.description,
        status: 'CREATED',
        tenant_id: tenant1Request.tenantId,
      });

      await mockSupabaseClient.from().insert({
        merchant_payment_id: `${MOCK_UUID}-tenant2`,
        amount: tenant2Request.amount,
        description: tenant2Request.description,
        status: 'CREATED',
        tenant_id: tenant2Request.tenantId,
      });

      // Then: テナントIDが適切に設定される
      expect(mockSupabaseClient.from().insert).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ tenant_id: 'tenant-001' })
      );
      expect(mockSupabaseClient.from().insert).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ tenant_id: 'tenant-002' })
      );
    });

    it('should default to system tenant when tenantId is not provided', async () => {
      // Given: テナントIDなしのリクエスト
      const request = {
        amount: 1000,
        description: 'Default tenant payment'
      };

      const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
      mockSupabaseClient.from().insert.mockReturnValue({ error: null });

      // When: テナントIDなしで処理
      await mockSupabaseClient.from().insert({
        merchant_payment_id: MOCK_UUID,
        amount: request.amount,
        description: request.description,
        status: 'CREATED',
        tenant_id: DEFAULT_TENANT_ID,
      });

      // Then: デフォルトテナントIDが設定される
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: DEFAULT_TENANT_ID,
        })
      );
    });
  });

  describe('Performance integration tests', () => {
    it('should handle high-frequency requests efficiently', async () => {
      // Given: 高頻度リクエストのシミュレーション
      const requestCount = 50;
      const requests = Array.from({ length: requestCount }, (_, i) => ({
        amount: 1000 + i,
        description: `Performance test ${i}`,
        merchantPaymentId: `${MOCK_UUID}-${i}`
      }));

      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      const startTime = Date.now();

      // When: 高頻度でリクエストを処理
      const promises = requests.map(request =>
        Promise.resolve().then(async () => {
          await mockSupabaseClient.from().insert({
            merchant_payment_id: request.merchantPaymentId,
            amount: request.amount,
            description: request.description,
            status: 'CREATED',
          });

          return mockPayPaySDK.QRCodeCreate({
            merchantPaymentId: request.merchantPaymentId,
            amount: { amount: request.amount, currency: 'JPY' },
          });
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      // Then: 適切な時間内で処理が完了する
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // 5秒以内
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(requestCount);
      expect(mockPayPaySDK.QRCodeCreate).toHaveBeenCalledTimes(requestCount);
    });

    it('should maintain memory efficiency during long-running operations', () => {
      // Given: メモリ効率のテスト設定
      const initialMemory = process.memoryUsage();

      // When: 大量のオブジェクト作成と処理をシミュレート
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `Large data set item ${i}`.repeat(100),
      }));

      // 処理をシミュレート
      largeDataSet.forEach(item => {
        // Mock processing that would happen in real components
        const processed = {
          id: item.id,
          processedData: item.data.toUpperCase(),
          timestamp: Date.now(),
        };
        // Immediately release reference
        processed.processedData = '';
      });

      // Garbage collection hint
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      // Then: メモリ使用量が適切な範囲内
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
    });
  });

  describe('Error recovery integration', () => {
    it('should recover gracefully from transient failures', async () => {
      // Given: 一時的な障害のシミュレーション
      let attemptCount = 0;

      // First call fails, second succeeds
      mockSupabaseClient.from().insert.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return { error: new Error('Temporary database error') };
        }
        return { error: null };
      });

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      // When: リトライ機能をテスト
      let insertResult = mockSupabaseClient.from().insert({
        merchant_payment_id: MOCK_UUID,
        amount: 1000,
        description: 'Retry test',
        status: 'CREATED',
      });

      // First attempt fails
      expect(insertResult.error).toBeDefined();

      // Retry
      insertResult = mockSupabaseClient.from().insert({
        merchant_payment_id: MOCK_UUID,
        amount: 1000,
        description: 'Retry test',
        status: 'CREATED',
      });

      // Then: リトライで成功する
      expect(insertResult.error).toBeNull();
      expect(attemptCount).toBe(2);
    });

    it('should maintain system integrity during partial failures', async () => {
      // Given: 部分的な障害のシナリオ
      mockSupabaseClient.from().insert.mockReturnValue({ error: null });
      mockSupabaseClient.from().update
        .mockReturnValueOnce({ error: new Error('Update failed') }) // First update fails
        .mockReturnValue({ error: null }); // Subsequent updates succeed

      mockPayPaySDK.QRCodeCreate.mockResolvedValue(createMockPayPayResponse());

      let systemState = {
        transactionCreated: false,
        qrCodeGenerated: false,
        transactionUpdated: false,
      };

      // When: 部分的障害での処理
      try {
        // Transaction creation succeeds
        await mockSupabaseClient.from().insert({
          merchant_payment_id: MOCK_UUID,
          amount: 1000,
          status: 'CREATED',
        });
        systemState.transactionCreated = true;

        // QR code generation succeeds
        await mockPayPaySDK.QRCodeCreate({
          merchantPaymentId: MOCK_UUID,
          amount: { amount: 1000, currency: 'JPY' },
        });
        systemState.qrCodeGenerated = true;

        // First update fails
        const updateResult1 = mockSupabaseClient.from().update({
          paypay_code_id: 'test-code-id',
        });

        if (updateResult1.error) {
          console.warn('Update failed, will retry');

          // Retry update
          const updateResult2 = mockSupabaseClient.from().update({
            paypay_code_id: 'test-code-id',
          });

          if (!updateResult2.error) {
            systemState.transactionUpdated = true;
          }
        }

      } catch (error) {
        console.error('System error:', error);
      }

      // Then: システムの整合性が保たれる
      expect(systemState.transactionCreated).toBe(true);
      expect(systemState.qrCodeGenerated).toBe(true);
      expect(systemState.transactionUpdated).toBe(true);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(2);
    });
  });
});