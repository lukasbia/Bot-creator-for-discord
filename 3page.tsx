'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Plus, Bot, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface BotData {
  id: string
  name: string
  avatar?: string
  banner?: string
  isHosted: boolean
  scriptCount: number
  variableCount: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bots, setBots] = useState<BotData[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newBot, setNewBot] = useState({ name: '', token: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchBots()
  }, [status, router])

  const fetchBots = async () => {
    const res = await fetch('/api/bots')
    if (res.ok) setBots(await res.json())
  }

  const createBot = async () => {
    setLoading(true)
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBot)
    })
    if (res.ok) {
      setShowAdd(false)
      setNewBot({ name: '', token: '' })
      fetchBots()
    }
    setLoading(false)
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-tint"/></div>

  return (
    <div className="min-h-screen bg-ios-bg">
      <header className="sticky top-0 z-50 ios-nav-blur px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Bots</h1>
        <button onClick={() => setShowAdd(true)} className="ios-button rounded-ios-full px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Bot
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <AnimatePresence>
          {bots.map((bot, i) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/bot/${bot.id}`}>
                <div className="ios-card p-0 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                  {bot.banner && (
                    <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${bot.banner})` }} />
                  )}
                  <div className="p-4 flex items-center gap-4">
                    <img src={bot.avatar || '/default-avatar.png'} alt={bot.name} className="w-14 h-14 rounded-ios-full bg-ios-gray-4" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{bot.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-ios-gray mt-1">
                        <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {bot.scriptCount} scripts</span>
                        <span>{bot.variableCount} vars</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bot.isHosted && <Zap className="w-5 h-5 text-ios-success" />}
                      <ChevronRight className="w-5 h-5 text-ios-gray-3" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>

        {bots.length === 0 && (
          <div className="text-center py-20 text-ios-gray">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No bots yet</p>
            <p className="text-sm mt-1">Tap &quot;Add Bot&quot; to get started</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="ios-sheet w-full max-w-md p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-ios-gray-4 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold text-center">Create New Bot</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-ios-gray mb-1 block">Bot Name</label>
                  <input className="ios-input" value={newBot.name} onChange={e => setNewBot({...newBot, name: e.target.value})} placeholder="My Awesome Bot" />
                </div>
                <div>
                  <label className="text-sm font-medium text-ios-gray mb-1 block">Discord Token</label>
                  <input className="ios-input" type="password" value={newBot.token} onChange={e => setNewBot({...newBot, token: e.target.value})} placeholder="Bot token from Discord Developer Portal" />
                </div>
                <button onClick={createBot} disabled={loading} className="w-full ios-button py-4 mt-2 disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Bot'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
