import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PopPay - PayPay延長料金支払い',
  description: 'カウンセリング等の延長料金をPayPayで支払うためのWebアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}