'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bot, Shield, Zap } from 'lucide-react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-tint"/></div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-ios-bg">
      <div className="w-full max-w-sm space-y-8 animate-ios-fade-in">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-ios-tint rounded-ios-xl mx-auto flex items-center justify-center shadow-ios-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">CBScript</h1>
          <p className="text-ios-gray text-lg">Bot Designer for Discord</p>
        </div>

        <div className="space-y-4 ios-card">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Zap className="w-5 h-5 text-ios-tint" />
            <span>Custom CBScript language transpiles to JavaScript</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Shield className="w-5 h-5 text-ios-success" />
            <span>Secure cloud hosting with variable storage</span>
          </div>
        </div>

        <button
          onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
          className="w-full ios-button text-lg py-4 shadow-ios-lg hover:shadow-ios-modal transition-shadow"
        >
          Continue with Discord
        </button>
      </div>
    </div>
  )
}
