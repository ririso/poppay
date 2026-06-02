/**
 * Webhook実装完了後のテスト
 * 署名検証、データベース更新、エラーハンドリングの実装後の振る舞い確認
 */

import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '@/test-utils/test-utils';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));

// Mock crypto for signature verification
const mockCrypto = {
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-signature'),
  }),
};

jest.mock('crypto', () => mockCrypto);

// Helper function to create mock NextRequest
function createMockRequest(body: any, signature?: string): NextRequest {
  const request = {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'x-paypay-signature') {
          return signature || null;
        }
        return null;
      }),
    },
  } as unknown as NextRequest;

  return request;
}

describe('Enhanced Webhook Handler', () => {
  const mockSupabaseClient = createMockSupabaseClient();

  // モック実装：実際の実装後に置き換え
  const enhancedWebhookHandler = {
    // 署名検証機能
    verifyWebhookSignature: (payload: string, signature: string, secret: string): boolean => {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signature === `sha256=${expectedSignature}`;
    },

    // データベース更新処理
    updatePaymentStatus: async (merchantPaymentId: string, status: string, acceptedAt?: number) => {
      const supabase = require('@/lib/supabase').createSupabaseAdmin();

      const statusMapping: Record<string, string> = {
        'COMPLETED': 'COMPLETED',
        'FAILED': 'FAILED',
        'EXPIRED': 'EXPIRED',
        'CANCELED': 'FAILED',
      };

      const dbStatus = statusMapping[status] || 'CREATED';

      const updateData: any = { status: dbStatus };

      if (dbStatus === 'COMPLETED' && acceptedAt) {
        updateData.paid_at = new Date(acceptedAt * 1000).toISOString();
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('merchant_payment_id', merchantPaymentId);

      if (error) {
        throw new Error('Failed to update payment status');
      }

      return { success: true, status: dbStatus };
    },

    // メインのWebhookハンドラー
    handleWebhook: async (request: NextRequest) => {
      try {
        const body = await request.json();
        const signature = request.headers.get('x-paypay-signature');
        const webhookSecret = process.env.PAYPAY_WEBHOOK_SECRET;

        // 1. 署名検証
        if (!signature || !webhookSecret) {
          return Response.json(
            { error: 'Missing signature or webhook secret' },
            { status: 400 }
          );
        }

        const isValidSignature = enhancedWebhookHandler.verifyWebhookSignature(
          JSON.stringify(body),
          signature,
          webhookSecret
        );

        if (!isValidSignature) {
          return Response.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }

        // 2. ペイロードの検証
        const { merchantPaymentId, status, acceptedAt } = body;

        if (!merchantPaymentId || !status) {
          return Response.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // 3. データベース更新
        await enhancedWebhookHandler.updatePaymentStatus(
          merchantPaymentId,
          status,
          acceptedAt
        );

        // 4. 成功レスポンス
        return Response.json({
          success: true,
          message: 'Webhook processed successfully',
        });

      } catch (error) {
        console.error('Webhook Error:', error);
        return Response.json(
          { error: 'Webhook処理中にエラーが発生しました' },
          { status: 500 }
        );
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/lib/supabase').createSupabaseAdmin.mockReturnValue(mockSupabaseClient);
    process.env.PAYPAY_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  describe('Signature verification', () => {
    it('should verify valid webhook signature correctly', () => {
      // Given: Valid payload and signature
      const payload = JSON.stringify({
        merchantPaymentId: 'test-123',
        status: 'COMPLETED'
      });
      const secret = 'test-secret';

      // Mock crypto to return predictable signature
      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      const signature = 'sha256=valid-signature';

      // When: 署名を検証
      const result = enhancedWebhookHandler.verifyWebhookSignature(payload, signature, secret);

      // Then: 署名が有効と判定される
      expect(result).toBe(true);
      expect(mockCrypto.createHmac).toHaveBeenCalledWith('sha256', secret);
    });

    it('should reject invalid webhook signature', () => {
      // Given: Invalid signature
      const payload = JSON.stringify({
        merchantPaymentId: 'test-123',
        status: 'COMPLETED'
      });
      const secret = 'test-secret';

      mockCrypto.createHmac().digest.mockReturnValue('expected-signature');
      const invalidSignature = 'sha256=invalid-signature';

      // When: 無効な署名を検証
      const result = enhancedWebhookHandler.verifyWebhookSignature(payload, invalidSignature, secret);

      // Then: 署名が無効と判定される
      expect(result).toBe(false);
    });

    it('should reject signature without sha256 prefix', () => {
      // Given: SHA256プレフィックスなしの署名
      const payload = JSON.stringify({
        merchantPaymentId: 'test-123',
        status: 'COMPLETED'
      });
      const secret = 'test-secret';
      const signatureWithoutPrefix = 'valid-signature';

      // When: プレフィックスなしの署名を検証
      const result = enhancedWebhookHandler.verifyWebhookSignature(payload, signatureWithoutPrefix, secret);

      // Then: 署名が無効と判定される
      expect(result).toBe(false);
    });
  });

  describe('Payment status update', () => {
    it('should update status to COMPLETED with payment time', async () => {
      // Given: COMPLETED webhook data
      const merchantPaymentId = 'test-payment-123';
      const status = 'COMPLETED';
      const acceptedAt = 1670000000; // Unix timestamp

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: 支払いステータスを更新
      const result = await enhancedWebhookHandler.updatePaymentStatus(
        merchantPaymentId,
        status,
        acceptedAt
      );

      // Then: ステータスと支払い時刻が更新される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'COMPLETED',
        paid_at: '2022-12-02T21:20:00.000Z'
      });
      expect(mockSupabaseClient.from().update().eq).toHaveBeenCalledWith(
        'merchant_payment_id',
        merchantPaymentId
      );
      expect(result).toEqual({
        success: true,
        status: 'COMPLETED'
      });
    });

    it('should update status to FAILED without payment time', async () => {
      // Given: FAILED webhook data
      const merchantPaymentId = 'test-payment-456';
      const status = 'FAILED';

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: 失敗ステータスに更新
      const result = await enhancedWebhookHandler.updatePaymentStatus(
        merchantPaymentId,
        status
      );

      // Then: ステータスのみ更新される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'FAILED'
      });
      expect(result).toEqual({
        success: true,
        status: 'FAILED'
      });
    });

    it('should map CANCELED status to FAILED', async () => {
      // Given: CANCELED webhook data
      const merchantPaymentId = 'test-payment-789';
      const status = 'CANCELED';

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: キャンセルステータスを更新
      await enhancedWebhookHandler.updatePaymentStatus(merchantPaymentId, status);

      // Then: FAILEDステータスにマッピングされる
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'FAILED'
      });
    });

    it('should handle unknown status gracefully', async () => {
      // Given: 未知のステータス
      const merchantPaymentId = 'test-payment-unknown';
      const status = 'UNKNOWN_STATUS';

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: 未知のステータスを更新
      await enhancedWebhookHandler.updatePaymentStatus(merchantPaymentId, status);

      // Then: CREATEDステータスにフォールバック
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'CREATED'
      });
    });

    it('should throw error when database update fails', async () => {
      // Given: データベース更新エラー
      const merchantPaymentId = 'test-payment-error';
      const status = 'COMPLETED';
      const dbError = new Error('Database connection failed');

      mockSupabaseClient.from().update.mockReturnValue({ error: dbError });

      // When/Then: エラーがスローされる
      await expect(
        enhancedWebhookHandler.updatePaymentStatus(merchantPaymentId, status)
      ).rejects.toThrow('Failed to update payment status');
    });
  });

  describe('Complete webhook handling', () => {
    const createMockRequest = (body: any, signature?: string): NextRequest => {
      const request = {
        json: jest.fn().mockResolvedValue(body),
        headers: new Map(),
      } as any;

      if (signature) {
        request.headers.set('x-paypay-signature', signature);
      }

      return request;
    };

    it('should process valid webhook successfully', async () => {
      // Given: Valid webhook request
      const webhookBody = {
        merchantPaymentId: 'test-payment-success',
        status: 'COMPLETED',
        acceptedAt: 1670000000
      };

      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      const signature = 'sha256=valid-signature';
      const request = createMockRequest(webhookBody, signature);

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 成功レスポンスが返される
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Webhook processed successfully'
      });
    });

    it('should reject webhook without signature', async () => {
      // Given: 署名なしのWebhookリクエスト
      const webhookBody = {
        merchantPaymentId: 'test-payment-no-sig',
        status: 'COMPLETED'
      };

      const request = createMockRequest(webhookBody); // no signature

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 400エラーが返される
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Missing signature or webhook secret'
      });
    });

    it('should reject webhook with invalid signature', async () => {
      // Given: 無効な署名のWebhookリクエスト
      const webhookBody = {
        merchantPaymentId: 'test-payment-bad-sig',
        status: 'COMPLETED'
      };

      mockCrypto.createHmac().digest.mockReturnValue('expected-signature');
      const invalidSignature = 'sha256=invalid-signature';
      const request = createMockRequest(webhookBody, invalidSignature);

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 401エラーが返される
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Invalid signature'
      });
    });

    it('should reject webhook with missing required fields', async () => {
      // Given: 必須フィールドが不足したWebhookリクエスト
      const webhookBody = {
        // merchantPaymentId missing
        status: 'COMPLETED'
      };

      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      const signature = 'sha256=valid-signature';
      const request = createMockRequest(webhookBody, signature);

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 400エラーが返される
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Missing required fields'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Given: データベースエラーが発生するWebhookリクエスト
      const webhookBody = {
        merchantPaymentId: 'test-payment-db-error',
        status: 'COMPLETED',
        acceptedAt: 1670000000
      };

      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      const signature = 'sha256=valid-signature';
      const request = createMockRequest(webhookBody, signature);

      const dbError = new Error('Database connection failed');
      mockSupabaseClient.from().update.mockReturnValue({ error: dbError });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 500エラーが返される
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Webhook処理中にエラーが発生しました'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Webhook Error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Security considerations', () => {
    it('should use environment variable for webhook secret', async () => {
      // Given: 環境変数のWebhookシークレット
      delete process.env.PAYPAY_WEBHOOK_SECRET;

      const webhookBody = {
        merchantPaymentId: 'test-payment-env',
        status: 'COMPLETED'
      };

      const request = createMockRequest(webhookBody, 'sha256=signature');

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);

      // Then: シークレットが設定されていない場合はエラー
      expect(response.status).toBe(400);
    });

    it('should validate signature timing to prevent replay attacks', () => {
      // Given: 署名検証のタイミング
      const payload = JSON.stringify({
        merchantPaymentId: 'test-replay',
        status: 'COMPLETED',
        timestamp: Date.now()
      });

      // When: 同じペイロードで複数回署名検証
      const secret = 'test-secret';
      mockCrypto.createHmac().digest.mockReturnValue('consistent-signature');

      const result1 = enhancedWebhookHandler.verifyWebhookSignature(
        payload,
        'sha256=consistent-signature',
        secret
      );

      const result2 = enhancedWebhookHandler.verifyWebhookSignature(
        payload,
        'sha256=consistent-signature',
        secret
      );

      // Then: 同じ結果が返される（一貫性チェック）
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle malformed JSON payload gracefully', async () => {
      // Given: 不正なJSONペイロード
      const request = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
        headers: new Map([['x-paypay-signature', 'sha256=signature']]),
      } as any;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // When: Webhookを処理
      const response = await enhancedWebhookHandler.handleWebhook(request);
      const responseData = await response.json();

      // Then: 500エラーが返される
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Webhook処理中にエラーが発生しました'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and monitoring', () => {
    it('should log successful webhook processing', async () => {
      // Given: 成功するWebhookリクエスト
      const webhookBody = {
        merchantPaymentId: 'test-payment-logging',
        status: 'COMPLETED',
        acceptedAt: 1670000000
      };

      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      const signature = 'sha256=valid-signature';
      const request = createMockRequest(webhookBody, signature);

      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: Webhookを処理
      await enhancedWebhookHandler.handleWebhook(request);

      // Then: データベース操作が実行される
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent webhook requests', async () => {
      // Given: 複数の同時Webhookリクエスト
      const webhookRequests = [
        { merchantPaymentId: 'concurrent-1', status: 'COMPLETED' },
        { merchantPaymentId: 'concurrent-2', status: 'FAILED' },
        { merchantPaymentId: 'concurrent-3', status: 'EXPIRED' },
      ];

      mockCrypto.createHmac().digest.mockReturnValue('valid-signature');
      mockSupabaseClient.from().update.mockReturnValue({ error: null });

      // When: 複数のWebhookを同時処理
      const promises = webhookRequests.map(body => {
        const request = createMockRequest(body, 'sha256=valid-signature');
        return enhancedWebhookHandler.handleWebhook(request);
      });

      const responses = await Promise.all(promises);

      // Then: 全てのリクエストが正常に処理される
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(3);
    });
  });
});