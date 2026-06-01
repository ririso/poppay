import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive().max(1000000, '金額は100万円以下で入力してください').int('金額は整数で入力してください'),
  description: z.string().optional().default('PayPay決済').transform((val) => val || 'PayPay決済'),
});

export const merchantPaymentIdSchema = z.string().uuid('無効な決済IDです');

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type MerchantPaymentId = z.infer<typeof merchantPaymentIdSchema>;