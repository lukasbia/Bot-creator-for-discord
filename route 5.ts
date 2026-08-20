import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { transpileCBScript, wrapInEventHandler } from '@/lib/cbscript-transpiler'
import { botManager } from '@/lib/bot-manager'
import { saveScriptToGitHub, deleteScriptFromGitHub } from '@/lib/github'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  })

  if (!bot || bot.owner.email !== session.user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const scripts = await prisma.script.findMany({
    where: { botId: params.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(scripts.map(s => ({
    id: s.id,
    name: s.name,
    trigger: s.trigger,
    slashTrigger: s.slashTrigger,
    isSlashCommand: s.isSlashCommand,
    cbscriptCode: s.cbscriptCode,
    javascriptCode: s.javascriptCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  })

  if (!bot || bot.owner.email !== session.user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { name, trigger, slashTrigger, isSlashCommand, cbscriptCode } = await req.json()

  if (!name || !trigger) {
    return NextResponse.json({ error: 'Name and trigger required' }, { status: 400 })
  }

  // Transpile CBScript to JavaScript
  const { javascript, errors } = transpileCBScript(cbscriptCode || '', {
    botId: params.id,
    scriptId: 'new'
  })

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Transpilation errors', errors }, { status: 400 })
  }

  const wrappedJs = wrapInEventHandler(javascript, trigger, isSlashCommand, slashTrigger)

  const script = await prisma.script.create({
    data: {
      botId: params.id,
      name,
      trigger,
      slashTrigger: slashTrigger || null,
      isSlashCommand: isSlashCommand || false,
      cbscriptCode: cbscriptCode || '',
      javascriptCode: wrappedJs,
    }
  })

  // Save to GitHub
  try {
    await saveScriptToGitHub(params.id, script.id, name, wrappedJs)
  } catch (e) {
    console.error('GitHub save failed:', e)
  }

  // Reload bot if hosted
  if (bot.isHosted) {
    await botManager.reloadScripts(params.id)
  }

  return NextResponse.json({
    id: script.id,
    name: script.name,
    trigger: script.trigger,
    slashTrigger: script.slashTrigger,
    isSlashCommand: script.isSlashCommand,
    cbscriptCode: script.cbscriptCode,
    javascriptCode: script.javascriptCode,
    isActive: script.isActive,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
  })
}
