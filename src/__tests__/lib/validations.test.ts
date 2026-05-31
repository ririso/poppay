import { createPaymentSchema, merchantPaymentIdSchema } from '@/lib/validations'
import { z } from 'zod'

describe('Validation Schemas', () => {
  describe('createPaymentSchema', () => {
    describe('amount validation', () => {
      it('should accept valid positive amounts', () => {
        const validData = { amount: 100, description: 'Test payment' }
        const result = createPaymentSchema.safeParse(validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.amount).toBe(100)
        }
      })

      it('should accept amounts up to 1,000,000', () => {
        const validData = { amount: 1000000, description: 'Large payment' }
        const result = createPaymentSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should reject zero amounts', () => {
        const invalidData = { amount: 0, description: 'Zero payment' }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Number must be greater than 0')
        }
      })

      it('should reject negative amounts', () => {
        const invalidData = { amount: -100, description: 'Negative payment' }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Number must be greater than 0')
        }
      })

      it('should reject amounts over 1,000,000', () => {
        const invalidData = { amount: 1000001, description: 'Too large payment' }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('金額は100万円以下で入力してください')
        }
      })

      it('should reject non-numeric amounts', () => {
        const invalidData = { amount: '100', description: 'String amount' }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })
    })

    describe('description validation', () => {
      it('should accept valid descriptions', () => {
        const validData = { amount: 100, description: 'Valid description' }
        const result = createPaymentSchema.safeParse(validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.description).toBe('Valid description')
        }
      })

      it('should accept descriptions up to 256 characters', () => {
        const longDescription = 'a'.repeat(256)
        const validData = { amount: 100, description: longDescription }
        const result = createPaymentSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should reject empty descriptions', () => {
        const invalidData = { amount: 100, description: '' }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('説明文を入力してください')
        }
      })

      it('should reject descriptions over 256 characters', () => {
        const tooLongDescription = 'a'.repeat(257)
        const invalidData = { amount: 100, description: tooLongDescription }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('説明文は256文字以下で入力してください')
        }
      })

      it('should reject missing description field', () => {
        const invalidData = { amount: 100 }
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].path).toContain('description')
        }
      })
    })

    describe('complete data validation', () => {
      it('should validate complete valid payment data', () => {
        const validData = { amount: 500, description: '30分延長料金' }
        const result = createPaymentSchema.safeParse(validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      it('should reject data with missing required fields', () => {
        const invalidData = {}
        const result = createPaymentSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors).toHaveLength(2) // amount and description errors
        }
      })

      it('should reject data with extra fields', () => {
        const dataWithExtra = { 
          amount: 100, 
          description: 'Test', 
          extraField: 'should be stripped' 
        }
        const result = createPaymentSchema.safeParse(dataWithExtra)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).not.toHaveProperty('extraField')
        }
      })
    })
  })

  describe('merchantPaymentIdSchema', () => {
    it('should accept valid UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const result = merchantPaymentIdSchema.safeParse(validUUID)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(validUUID)
      }
    })

    it('should reject invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid'
      const result = merchantPaymentIdSchema.safeParse(invalidUUID)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('無効な決済IDです')
      }
    })

    it('should reject empty string', () => {
      const result = merchantPaymentIdSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject non-string values', () => {
      const result = merchantPaymentIdSchema.safeParse(123)
      expect(result.success).toBe(false)
    })

    it('should reject UUID with incorrect format', () => {
      const invalidUUID = '123e4567-e89b-12d3-a456'
      const result = merchantPaymentIdSchema.safeParse(invalidUUID)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('無効な決済IDです')
      }
    })
  })
})
