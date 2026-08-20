/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['discord.js'],
  },
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
}

module.exports = nextConfig
