// Mock for Supabase client
export const createClient = jest.fn(() => ({
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null, data: null })),
    update: jest.fn(() => ({ error: null, data: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ error: null, data: null })),
      })),
    })),
    eq: jest.fn(),
    single: jest.fn(),
  })),
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}))
