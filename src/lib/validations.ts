import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive().max(1000000, '金額は100万円以下で入力してください'),
  description: z.string().min(1, '説明文を入力してください').max(256, '説明文は256文字以下で入力してください'),
});

export const merchantPaymentIdSchema = z.string().uuid('無効な決済IDです');

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type MerchantPaymentId = z.infer<typeof merchantPaymentIdSchema>;