import { createSupabaseAdmin, validateSupabaseConfig } from '@/lib/supabase'

// Mock Supabase module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

describe('Supabase Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  describe('createSupabaseAdmin', () => {
    it('should create admin client when service role key is provided', () => {
      const mockCreateClient = require('@supabase/supabase-js').createClient
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const mockClient = { from: jest.fn() }
      mockCreateClient.mockReturnValue(mockClient)

      const result = createSupabaseAdmin()

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
      expect(result).toBe(mockClient)
    })

    it('should return mock client when service role key is missing', () => {
      // Service role key not set
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const result = createSupabaseAdmin()

      // Should return mock client with expected interface
      expect(result.from).toBeDefined()
      expect(typeof result.from).toBe('function')

      // Test mock client behavior
      const mockTable = result.from('transactions')
      expect(mockTable.insert).toBeDefined()
      expect(mockTable.update).toBeDefined()
      expect(mockTable.select).toBeDefined()

      // Test mock operations return expected format
      expect(mockTable.insert()).toEqual({ error: null })
      expect(mockTable.update()).toEqual({ error: null })
      expect(mockTable.select()).toEqual({ data: null, error: new Error('Supabase not configured') })
    })

    it('should warn when service role key is missing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      createSupabaseAdmin()

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Database operations will be skipped.'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('validateSupabaseConfig', () => {
    it('should return true for all flags when all environment variables are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

      const result = validateSupabaseConfig()

      expect(result).toEqual({
        hasUrl: true,
        hasAnonKey: true,
        hasServiceKey: true,
        isConfigured: true,
      })
    })

    it('should return false for flags when environment variables are missing', () => {
      // All variables unset
      const result = validateSupabaseConfig()

      expect(result).toEqual({
        hasUrl: false,
        hasAnonKey: false,
        hasServiceKey: false,
        isConfigured: false,
      })
    })

    it('should return partial configuration when only some variables are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      // NEXT_PUBLIC_SUPABASE_ANON_KEY not set
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

      const result = validateSupabaseConfig()

      expect(result).toEqual({
        hasUrl: true,
        hasAnonKey: false,
        hasServiceKey: true,
        isConfigured: false, // Requires both URL and anon key
      })
    })

    it('should consider configured when URL and anon key are present (without service key)', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      // SUPABASE_SERVICE_ROLE_KEY not set

      const result = validateSupabaseConfig()

      expect(result).toEqual({
        hasUrl: true,
        hasAnonKey: true,
        hasServiceKey: false,
        isConfigured: true, // Only requires URL and anon key for basic configuration
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle development environment with placeholder URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-key'

      const config = validateSupabaseConfig()
      expect(config.hasUrl).toBe(true)
      expect(config.hasAnonKey).toBe(true)
      expect(config.isConfigured).toBe(true)

      const adminClient = createSupabaseAdmin()
      expect(adminClient.from).toBeDefined()
    })

    it('should handle production-like environment', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'

      const config = validateSupabaseConfig()
      expect(config.isConfigured).toBe(true)
      expect(config.hasServiceKey).toBe(true)

      const mockCreateClient = require('@supabase/supabase-js').createClient
      const mockClient = { from: jest.fn() }
      mockCreateClient.mockReturnValue(mockClient)

      const adminClient = createSupabaseAdmin()
      expect(mockCreateClient).toHaveBeenCalled()
      expect(adminClient).toBe(mockClient)
    })
  })
})
