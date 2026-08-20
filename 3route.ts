import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { botManager } from '@/lib/bot-manager'
import { getBotProfile, getAvatarUrl, getBannerUrl } from '@/lib/discord-oauth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { scripts: true, variables: true } },
      owner: { select: { email: true } }
    }
  })

  if (!bot || bot.owner.email !== session.user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: bot.id,
    discordId: bot.discordId,
    name: bot.name,
    avatar: bot.avatar,
    banner: bot.banner,
    token: bot.token,
    isHosted: bot.isHosted,
    hostingExpiresAt: bot.hostingExpiresAt?.toISOString(),
    guildCount: bot.guildCount,
    scriptCount: bot._count.scripts,
    variableCount: bot._count.variables,
    createdAt: bot.createdAt.toISOString(),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const { name, token } = await req.json()
  const updateData: any = {}

  if (name) updateData.name = name
  if (token) {
    const profile = await getBotProfile(token)
    if (profile) {
      updateData.token = token
      updateData.discordId = profile.id
      updateData.avatar = getAvatarUrl(profile.id, profile.avatar, profile.discriminator)
      updateData.banner = getBannerUrl(profile.id, profile.banner)
    }
  }

  const updated = await prisma.bot.update({
    where: { id: params.id },
    data: updateData
  })

  if (bot.isHosted && (name || token)) {
    await botManager.restartBot(bot.id, updated.token)
  }

  return NextResponse.json({ success: true, bot: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

  await botManager.stopBot(bot.id)
  await prisma.bot.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
