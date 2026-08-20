import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  })
  if (!bot || bot.owner.email !== session.user.email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const vars = await prisma.variable.findMany({ where: { botId: params.id } })
  return NextResponse.json(vars.map(v => ({
    id: v.id, name: v.name, value: v.value, scope: v.scope,
    userId: v.userId, guildId: v.guildId, createdAt: v.createdAt.toISOString()
  })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bot = await prisma.bot.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  })
  if (!bot || bot.owner.email !== session.user.email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, value, scope } = await req.json()
  const variable = await prisma.variable.create({
    data: { botId: params.id, name, value: value || '', scope: scope || 'global' }
  })

  return NextResponse.json({ id: variable.id, name: variable.name, value: variable.value, scope: variable.scope, createdAt: variable.createdAt.toISOString() })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { variableId } = await req.json()
  await prisma.variable.deleteMany({
    where: { id: variableId, botId: params.id }
  })
  return NextResponse.json({ success: true })
}
