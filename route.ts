import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from '@/lib/prisma'

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds bot applications.commands',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false

      const discordProfile = profile as any

      await prisma.user.upsert({
        where: { discordId: discordProfile.id },
        update: {
          username: discordProfile.username,
          discriminator: discordProfile.discriminator,
          avatar: discordProfile.avatar,
          email: discordProfile.email,
        },
        create: {
          discordId: discordProfile.id,
          username: discordProfile.username,
          discriminator: discordProfile.discriminator,
          avatar: discordProfile.avatar,
          email: discordProfile.email,
        },
      })

      return true
    },
    async session({ session, token }) {
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { discordId: token.sub },
        })
        if (user) {
          session.user.id = user.id
          session.user.discordId = user.discordId
        }
      }
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = (profile as any).id
      }
      return token
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
})

export { handler as GET, handler as POST }
