import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes } from 'discord.js'
import { prisma } from './prisma'
import { transpileCBScript, wrapInEventHandler } from './cbscript-transpiler'
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

const RUNTIME_DIR = join(process.cwd(), 'runtime', 'bots')

interface BotInstance {
  client: Client
  botId: string
  scripts: Map<string, any>
  slashCommands: Map<string, any>
}

class BotManager {
  private instances: Map<string, BotInstance> = new Map()

  async startBot(botId: string, token: string) {
    if (this.instances.has(botId)) {
      await this.stopBot(botId)
    }

    const botDir = join(RUNTIME_DIR, botId)
    if (!existsSync(botDir)) mkdirSync(botDir, { recursive: true })

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
      ],
    })

    // Inject CBScript database helpers
    client.cbscript = {
      getVar: async (name: string, scopeId: string) => {
        const v = await prisma.variable.findFirst({
          where: { botId, name, scope: 'global', userId: scopeId }
        })
        return v?.value || ''
      },
      setVar: async (name: string, value: string, scopeId: string) => {
        await prisma.variable.upsert({
          where: { botId_name_scope_userId_guildId: { botId, name, scope: 'global', userId: scopeId, guildId: null } },
          update: { value },
          create: { botId, name, value, scope: 'global', userId: scopeId }
        })
      },
      addVar: async (name: string, value: number, scopeId: string) => {
        const current = await client.cbscript.getVar(name, scopeId)
        const num = parseFloat(current) || 0
        await client.cbscript.setVar(name, String(num + value), scopeId)
      },
      subVar: async (name: string, value: number, scopeId: string) => {
        const current = await client.cbscript.getVar(name, scopeId)
        const num = parseFloat(current) || 0
        await client.cbscript.setVar(name, String(num - value), scopeId)
      },
      resetVar: async (name: string, scopeId: string) => {
        await prisma.variable.deleteMany({
          where: { botId, name, userId: scopeId }
        })
      }
    }

    const scripts = await prisma.script.findMany({
      where: { botId, isActive: true }
    })

    const scriptModules = new Map()
    const slashCommands = new Map()
    const slashBuilders: SlashCommandBuilder[] = []

    for (const script of scripts) {
      if (!script.javascriptCode) continue

      const scriptPath = join(botDir, `${script.id}.js`)
      const wrappedCode = wrapInEventHandler(
        script.javascriptCode,
        script.trigger,
        script.isSlashCommand,
        script.slashTrigger || undefined
      )
      writeFileSync(scriptPath, wrappedCode)

      delete require.cache[require.resolve(scriptPath)]
      const mod = require(scriptPath)
      scriptModules.set(script.id, mod)

      if (script.isSlashCommand && script.slashTrigger) {
        slashCommands.set(script.slashTrigger, mod)
        const builder = new SlashCommandBuilder()
          .setName(script.slashTrigger)
          .setDescription(`CBScript command: ${script.name}`)
        slashBuilders.push(builder)
      }
    }

    // Register slash commands
    if (slashBuilders.length > 0) {
      const rest = new REST({ version: '10' }).setToken(token)
      client.once('ready', async () => {
        try {
          await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: slashBuilders.map(b => b.toJSON()) }
          )
        } catch (e) {
          console.error('Failed to register slash commands:', e)
        }
      })
    }

    // Event handlers
    client.on('messageCreate', async (message) => {
      if (message.author.bot) return
      const msgArgs = message.content.slice(message.content.indexOf(' ') + 1).split(/\s+/)

      for (const [id, mod] of scriptModules) {
        if (mod.event === 'messageCreate' || mod.event === 'message') {
          try {
            await mod({ client, message, args: msgArgs })
          } catch (err) {
            console.error(`Script ${id} error:`, err)
          }
        }
      }
    })

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return
      const mod = slashCommands.get(interaction.commandName)
      if (mod) {
        try {
          await mod({ client, interaction, args: [] })
        } catch (err) {
          console.error(`Slash command error:`, err)
        }
      }
    })

    client.on('ready', () => {
      console.log(`Bot ${botId} is online as ${client.user?.tag}`)
    })

    await client.login(token)

    this.instances.set(botId, {
      client,
      botId,
      scripts: scriptModules,
      slashCommands
    })

    // Update bot info
    await prisma.bot.update({
      where: { id: botId },
      data: { isHosted: true, guildCount: client.guilds.cache.size }
    })

    return { success: true, user: client.user }
  }

  async stopBot(botId: string) {
    const instance = this.instances.get(botId)
    if (!instance) return false

    instance.client.destroy()
    this.instances.delete(botId)

    await prisma.bot.update({
      where: { id: botId },
      data: { isHosted: false }
    })

    return true
  }

  async restartBot(botId: string, token: string) {
    await this.stopBot(botId)
    return this.startBot(botId, token)
  }

  getStatus(botId: string) {
    return this.instances.has(botId)
  }

  async reloadScripts(botId: string) {
    const instance = this.instances.get(botId)
    if (!instance) return false
    const bot = await prisma.bot.findUnique({ where: { id: botId } })
    if (!bot) return false
    await this.restartBot(botId, bot.token)
    return true
  }
}

export const botManager = new BotManager()
