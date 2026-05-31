import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  env: {
    PAYPAY_CLIENT_ID: process.env.PAYPAY_CLIENT_ID,
    PAYPAY_ENV: process.env.PAYPAY_ENV,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig