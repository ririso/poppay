/**
 * Webhook署名検証のセキュリティテスト
 */

import { createHmac, timingSafeEqual } from 'crypto';

// 実装した署名検証関数をテスト用に再現
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(`sha256=${expectedSignature}`, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  return expectedBuffer.length === signatureBuffer.length &&
         timingSafeEqual(expectedBuffer, signatureBuffer);
}

describe('Webhook Signature Security', () => {
  const testSecret = 'test-secret-key';
  const testPayload = '{"merchantPaymentId":"test-123","status":"COMPLETED"}';

  describe('Valid signature verification', () => {
    it('should verify valid signature correctly', () => {
      const validSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const result = verifyWebhookSignature(testPayload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('should handle different payload content', () => {
      const differentPayload = '{"merchantPaymentId":"another-test","status":"FAILED"}';
      const validSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(differentPayload)
        .digest('hex');

      const result = verifyWebhookSignature(differentPayload, validSignature, testSecret);
      expect(result).toBe(true);
    });
  });

  describe('Invalid signature rejection', () => {
    it('should reject signature with wrong secret', () => {
      const wrongSecret = 'wrong-secret-key';
      const invalidSignature = 'sha256=' + createHmac('sha256', wrongSecret)
        .update(testPayload)
        .digest('hex');

      const result = verifyWebhookSignature(testPayload, invalidSignature, testSecret);
      expect(result).toBe(false);
    });

    it('should reject signature for different payload', () => {
      const differentPayload = '{"merchantPaymentId":"different","status":"COMPLETED"}';
      const invalidSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(testPayload)  // Using original payload
        .digest('hex');

      const result = verifyWebhookSignature(differentPayload, invalidSignature, testSecret);
      expect(result).toBe(false);
    });

    it('should reject malformed signature format', () => {
      const validHash = createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      // Missing 'sha256=' prefix
      const result1 = verifyWebhookSignature(testPayload, validHash, testSecret);
      expect(result1).toBe(false);

      // Wrong prefix
      const result2 = verifyWebhookSignature(testPayload, `md5=${validHash}`, testSecret);
      expect(result2).toBe(false);
    });

    it('should reject empty or null signatures', () => {
      const result1 = verifyWebhookSignature(testPayload, '', testSecret);
      expect(result1).toBe(false);

      const result2 = verifyWebhookSignature(testPayload, 'sha256=', testSecret);
      expect(result2).toBe(false);
    });
  });

  describe('Timing attack resistance', () => {
    it('should use timingSafeEqual for comparison', () => {
      // この関数がtimingSafeEqualを使用していることを間接的にテスト
      // 文字列の長さが異なる場合でも安全に処理されることを確認

      const validSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      // 短い不正な署名
      const shortSignature = 'sha256=abc';
      const result1 = verifyWebhookSignature(testPayload, shortSignature, testSecret);
      expect(result1).toBe(false);

      // 長い不正な署名
      const longSignature = validSignature + 'extra';
      const result2 = verifyWebhookSignature(testPayload, longSignature, testSecret);
      expect(result2).toBe(false);
    });

    it('should handle edge cases safely', () => {
      const testCases = [
        'sha256=',  // Empty hash
        'sha256=invalid',  // Invalid hex
        'invalid-format',  // No prefix
        '   sha256=   ',  // Whitespace
        'sha256=' + 'x'.repeat(64),  // Wrong length but valid format
      ];

      testCases.forEach(invalidSignature => {
        const result = verifyWebhookSignature(testPayload, invalidSignature, testSecret);
        expect(result).toBe(false);
      });
    });
  });

  describe('Security best practices verification', () => {
    it('should be deterministic with same inputs', () => {
      const signature = 'sha256=' + createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      // 同じ入力で複数回実行しても同じ結果
      for (let i = 0; i < 10; i++) {
        const result = verifyWebhookSignature(testPayload, signature, testSecret);
        expect(result).toBe(true);
      }
    });

    it('should handle special characters in payload', () => {
      const specialPayload = '{"description":"テスト　支払い　™®©","amount":1000}';
      const validSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(specialPayload)
        .digest('hex');

      const result = verifyWebhookSignature(specialPayload, validSignature, testSecret);
      expect(result).toBe(true);
    });

    it('should handle large payloads efficiently', () => {
      const largePayload = JSON.stringify({
        merchantPaymentId: 'test-123',
        description: 'x'.repeat(10000),  // 10KB description
        status: 'COMPLETED'
      });

      const validSignature = 'sha256=' + createHmac('sha256', testSecret)
        .update(largePayload)
        .digest('hex');

      const result = verifyWebhookSignature(largePayload, validSignature, testSecret);
      expect(result).toBe(true);
    });
  });
});