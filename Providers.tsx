'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1c1c1e',
          color: '#fff',
          borderRadius: '16px',
        },
      }} />
    </SessionProvider>
  )
}
