import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/Providers'

export const metadata = {
  title: 'CBScript Bot Designer',
  description: 'Design Discord bots with CBScript',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ios-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
