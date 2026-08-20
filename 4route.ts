import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { botManager } from '@/lib/bot-manager'
import { addDays } from 'date-fns'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  })
  if (!bot || bot.owner.email !== session.user.email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action } = await req.json()

  if (action === 'start') {
    if (bot.isHosted) return NextResponse.json({ error: 'Already hosted' }, { status: 400 })

    const result = await botManager.startBot(bot.id, bot.token)
    if (!result.success) return NextResponse.json({ error: 'Failed to start bot' }, { status: 500 })

    await prisma.bot.update({
      where: { id: params.id },
      data: { isHosted: true, hostingExpiresAt: addDays(new Date(), 1) }
    })
    return NextResponse.json({ success: true, status: 'online' })
  }

  if (action === 'stop') {
    await botManager.stopBot(bot.id)
    await prisma.bot.update({
      where: { id: params.id },
      data: { isHosted: false, hostingExpiresAt: null }
    })
    return NextResponse.json({ success: true, status: 'offline' })
  }

  if (action === 'watchAd') {
    const days = parseInt(process.env.HOSTING_CREDIT_DAYS_PER_AD || '1')
    const currentExpiry = bot.hostingExpiresAt || new Date()
    const newExpiry = addDays(new Date(currentExpiry), days)

    await prisma.hostingCredit.create({ data: { botId: bot.id, days } })
    await prisma.bot.update({
      where: { id: params.id },
      data: { hostingExpiresAt: newExpiry }
    })
    return NextResponse.json({ success: true, expiresAt: newExpiry.toISOString() })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
