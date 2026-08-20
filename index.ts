export interface DiscordUser {
  id: string
  username: string
  discriminator?: string
  avatar?: string
  email?: string
}

export interface BotData {
  id: string
  discordId: string
  name: string
  avatar?: string
  banner?: string
  token: string
  isHosted: boolean
  hostingExpiresAt?: string
  guildCount: number
  scriptCount: number
  variableCount: number
  createdAt: string
}

export interface ScriptData {
  id: string
  name: string
  trigger: string
  slashTrigger?: string
  isSlashCommand: boolean
  cbscriptCode: string
  javascriptCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface VariableData {
  id: string
  name: string
  value: string
  scope: string
  userId?: string
  guildId?: string
  createdAt: string
}

export interface CBScriptCommand {
  opcode: string
  command: string
  args: string[]
  raw: string
}

export interface TranspilerOptions {
  botId: string
  scriptId: string
}
