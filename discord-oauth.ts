import axios from 'axios'

const DISCORD_API = 'https://discord.com/api/v10'

export async function getDiscordToken(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/discord`,
  })

  const res = await axios.post(`${DISCORD_API}/oauth2/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return res.data
}

export async function getDiscordUser(accessToken: string) {
  const res = await axios.get(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.data
}

export async function getBotProfile(botToken: string) {
  try {
    const res = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` },
    })
    return res.data
  } catch {
    return null
  }
}

export function getAvatarUrl(userId: string, avatarHash: string | null, discriminator?: string) {
  if (avatarHash) {
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`
  }
  const defaultIndex = discriminator ? parseInt(discriminator) % 5 : 0
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
}

export function getBannerUrl(userId: string, bannerHash: string | null) {
  if (!bannerHash) return null
  const ext = bannerHash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=1024`
}
