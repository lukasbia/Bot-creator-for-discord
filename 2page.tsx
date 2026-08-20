'use client'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ArrowLeft, Play, Square, Settings, Code, Database, ExternalLink, Plus, Trash2, Save, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface BotDetail {
  id: string
  name: string
  avatar?: string
  token: string
  isHosted: boolean
  hostingExpiresAt?: string
  discordId: string
}

interface Script {
  id: string
  name: string
  trigger: string
  slashTrigger?: string
  isSlashCommand: boolean
  cbscriptCode: string
  javascriptCode: string
}

interface Variable {
  id: string
  name: string
  value: string
  scope: string
}

type Tab = 'overview' | 'scripts' | 'variables' | 'settings'

export default function BotPage() {
  const { id } = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [bot, setBot] = useState<BotDetail | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [scripts, setScripts] = useState<Script[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [showVarModal, setShowVarModal] = useState(false)
  const [editingScript, setEditingScript] = useState<Partial<Script>>({})
  const [code, setCode] = useState('')
  const [newVar, setNewVar] = useState({ name: '', value: '' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') {
      fetchBot()
      fetchScripts()
      fetchVariables()
    }
  }, [status, id])

  const fetchBot = async () => {
    const res = await fetch(`/api/bots/${id}`)
    if (res.ok) setBot(await res.json())
  }

  const fetchScripts = async () => {
    const res = await fetch(`/api/bots/${id}/scripts`)
    if (res.ok) setScripts(await res.json())
  }

  const fetchVariables = async () => {
    const res = await fetch(`/api/bots/${id}/variables`)
    if (res.ok) setVariables(await res.json())
  }

  const saveScript = async () => {
    const res = await fetch(`/api/bots/${id}/scripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingScript.name,
        trigger: editingScript.trigger,
        slashTrigger: editingScript.slashTrigger,
        isSlashCommand: editingScript.isSlashCommand,
        cbscriptCode: code
      })
    })
    if (res.ok) {
      toast.success('Script saved & transpiled!')
      setShowScriptModal(false)
      setCode('')
      setEditingScript({})
      fetchScripts()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Transpilation failed')
    }
  }

  const createVariable = async () => {
    await fetch(`/api/bots/${id}/variables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVar.name, value: newVar.value, scope: 'global' })
    })
    setShowVarModal(false)
    setNewVar({ name: '', value: '' })
    fetchVariables()
    toast.success('Variable created')
  }

  const toggleHosting = async (action: 'start' | 'stop') => {
    await fetch(`/api/bots/${id}/hosting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    fetchBot()
    toast.success(action === 'start' ? 'Bot is going online...' : 'Bot stopped')
  }

  const watchAd = async () => {
    await fetch(`/api/bots/${id}/hosting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'watchAd' })
    })
    fetchBot()
    toast.success('+1 Day hosting credit added!')
  }

  const updateBot = async (data: Partial<BotDetail>) => {
    await fetch(`/api/bots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    fetchBot()
    toast.success('Bot updated')
  }

  const deleteBot = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return
    await fetch(`/api/bots/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  if (!bot) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-tint"/></div>

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${bot.discordId}&permissions=8&scope=bot%20applications.commands`

  return (
    <div className="min-h-screen bg-ios-bg pb-24">
      <header className="sticky top-0 z-50 ios-nav-blur px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-ios-gray-5 rounded-ios-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold truncate">{bot.name}</h1>
            <p className="text-xs text-ios-gray">{bot.isHosted ? '● Online' : '○ Offline'}</p>
          </div>
          <a href={inviteUrl} target="_blank" rel="noreferrer" className="ios-button-secondary text-sm py-2 px-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Add to Server
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['overview', 'scripts', 'variables', 'settings'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-ios-full text-sm font-medium capitalize transition-all whitespace-nowrap ${
                tab === t ? 'bg-ios-tint text-white shadow-ios' : 'bg-white text-ios-gray hover:bg-ios-gray-5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
              <div className="ios-card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Hosting Status</h3>
                  <p className="text-sm text-ios-gray mt-1">
                    {bot.isHosted ? `Expires: ${bot.hostingExpiresAt ? new Date(bot.hostingExpiresAt).toLocaleDateString() : 'Never'}` : 'Bot is offline'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {bot.isHosted ? (
                    <button onClick={() => toggleHosting('stop')} className="p-3 bg-ios-danger/10 text-ios-danger rounded-ios-full hover:bg-ios-danger/20 transition-colors">
                      <Square className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={() => toggleHosting('start')} className="p-3 bg-ios-success/10 text-ios-success rounded-ios-full hover:bg-ios-success/20 transition-colors">
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="ios-card space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-ios-warning" /> Hosting Credits</h3>
                <p className="text-sm text-ios-gray">Watch an ad to get +1 day of hosting</p>
                <button onClick={watchAd} className="w-full ios-button-secondary py-3 text-sm">Watch Ad (+1 Day)</button>
              </div>
            </motion.div>
          )}

          {tab === 'scripts' && (
            <motion.div key="scripts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
              <div className="flex justify-end">
                <button onClick={() => { setEditingScript({}); setCode(''); setShowScriptModal(true) }} className="ios-button rounded-ios-full px-4 py-2 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Script
                </button>
              </div>

              {scripts.map(script => (
                <div key={script.id} className="ios-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{script.name}</h3>
                      <span className="text-xs bg-ios-gray-6 text-ios-gray px-2 py-1 rounded-ios-full">
                        {script.isSlashCommand ? `/${script.slashTrigger}` : script.trigger}
                      </span>
                    </div>
                    <button onClick={() => { setEditingScript(script); setCode(script.cbscriptCode); setShowScriptModal(true) }} className="p-2 hover:bg-ios-gray-6 rounded-ios-full transition-colors">
                      <Code className="w-4 h-4 text-ios-tint" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'variables' && (
            <motion.div key="variables" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
              <div className="flex justify-end">
                <button onClick={() => setShowVarModal(true)} className="ios-button rounded-ios-full px-4 py-2 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Variable
                </button>
              </div>

              {variables.map(v => (
                <div key={v.id} className="ios-card flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-sm text-ios-gray font-mono">{v.value}</p>
                  </div>
                  <span className="text-xs bg-ios-gray-6 text-ios-gray px-2 py-1 rounded-ios-full">{v.scope}</span>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
              <div className="ios-card space-y-4">
                <h3 className="font-semibold">Bot Settings</h3>
                <div>
                  <label className="text-sm text-ios-gray">Bot Name</label>
                  <input className="ios-input mt-1" defaultValue={bot.name} onBlur={e => updateBot({ name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-ios-gray">Discord Token</label>
                  <input className="ios-input mt-1" type="password" defaultValue={bot.token} onBlur={e => updateBot({ token: e.target.value })} />
                </div>
              </div>

              <button onClick={deleteBot} className="w-full ios-card flex items-center justify-center gap-2 text-ios-danger py-4 hover:bg-ios-danger/5 transition-colors">
                <Trash2 className="w-5 h-5" /> Delete Bot
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showScriptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowScriptModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="ios-sheet w-full max-w-3xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-ios-separator/50 flex items-center justify-between">
                <div className="w-12 h-1 bg-ios-gray-4 rounded-full absolute top-3 left-1/2 -translate-x-1/2 sm:hidden" />
                <h2 className="text-lg font-bold mt-4 sm:mt-0">{editingScript?.id ? 'Edit' : 'New'} Script</h2>
                <button onClick={saveScript} className="ios-button text-sm px-4 py-2 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save & Transpile
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-ios-gray">Script Name</label>
                    <input className="ios-input mt-1" value={editingScript.name || ''} onChange={e => setEditingScript({...editingScript, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm text-ios-gray">Trigger Event</label>
                    <select className="ios-input mt-1" value={editingScript.trigger || 'messageCreate'} onChange={e => setEditingScript({...editingScript, trigger: e.target.value})}>
                      <option value="messageCreate">On Message</option>
                      <option value="ready">On Ready</option>
                      <option value="guildMemberAdd">Member Join</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editingScript.isSlashCommand || false} onChange={e => setEditingScript({...editingScript, isSlashCommand: e.target.checked})} className="w-4 h-4 rounded border-ios-gray-3 text-ios-tint" />
                    Slash Command
                  </label>
                  {editingScript.isSlashCommand && (
                    <input className="ios-input flex-1 text-sm py-2" placeholder="command-name" value={editingScript.slashTrigger || ''} onChange={e => setEditingScript({...editingScript, slashTrigger: e.target.value})} />
                  )}
                </div>

                <div className="rounded-ios-lg overflow-hidden border border-ios-separator/50 bg-[#1c1c1e]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#2c2c2e] border-b border-[#3a3a3c]">
                    <span className="text-xs text-gray-400 font-mono">CBScript Terminal</span>
                    <span className="text-xs text-ios-tint">Auto-color</span>
                  </div>
                  <textarea
                    className="w-full h-64 bg-[#1c1c1e] text-[#4fc1ff] font-mono text-sm p-4 resize-none outline-none"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="<nif sendMessage{Hello World!}"
                    spellCheck={false}
                  />
                </div>

                <div className="bg-ios-gray-6 rounded-ios-lg p-3">
                  <p className="text-xs font-medium text-ios-gray mb-1">Quick Reference</p>
                  <div className="flex flex-wrap gap-2 text-xs text-ios-tint">
                    {['sendMessage', 'reply', 'if', 'getVar', 'setVar', 'createEmbed', 'addField', 'authorID'].map(cmd => (
                      <button key={cmd} onClick={() => setCode(c => c + `<nif ${cmd}{}\n`)} className="bg-white px-2 py-1 rounded-ios-full hover:shadow-ios transition-shadow">
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setShowVarModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="ios-sheet w-full max-w-sm p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-ios-gray-4 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold text-center">New Variable</h2>
              <input className="ios-input" placeholder="Variable name" value={newVar.name} onChange={e => setNewVar({...newVar, name: e.target.value})} />
              <input className="ios-input" placeholder="Initial value" value={newVar.value} onChange={e => setNewVar({...newVar, value: e.target.value})} />
              <button onClick={createVariable} className="w-full ios-button py-3">Create Variable</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
