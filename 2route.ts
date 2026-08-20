import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { getBotProfile, getAvatarUrl, getBannerUrl } from '@/lib/discord-oauth'
import { botManager } from '@/lib/bot-manager'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      bots: {
        include: {
          _count: { select: { scripts: true, variables: true } }
        }
      }
    }
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const bots = user.bots.map(bot => ({
    id: bot.id,
    discordId: bot.discordId,
    name: bot.name,
    avatar: bot.avatar,
    banner: bot.banner,
    isHosted: bot.isHosted,
    hostingExpiresAt: bot.hostingExpiresAt?.toISOString(),
    guildCount: bot.guildCount,
    scriptCount: bot._count.scripts,
    variableCount: bot._count.variables,
    createdAt: bot.createdAt.toISOString(),
  }))

  return NextResponse.json(bots)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, token } = await req.json()

  if (!name || !token) {
    return NextResponse.json({ error: 'Name and token required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const profile = await getBotProfile(token)
  if (!profile) {
    return NextResponse.json({ error: 'Invalid bot token' }, { status: 400 })
  }

  const bot = await prisma.bot.create({
    data: {
      discordId: profile.id,
      name: name || profile.username,
      avatar: getAvatarUrl(profile.id, profile.avatar, profile.discriminator),
      banner: getBannerUrl(profile.id, profile.banner),
      token,
      ownerId: user.id,
    }
  })

  return NextResponse.json({
    id: bot.id,
    discordId: bot.discordId,
    name: bot.name,
    avatar: bot.avatar,
    banner: bot.banner,
    isHosted: bot.isHosted,
    createdAt: bot.createdAt.toISOString(),
  })
}
