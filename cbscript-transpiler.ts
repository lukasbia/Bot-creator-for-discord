import { TranspilerOptions, CBScriptCommand } from '@/types'

/**
 * CBScript Transpiler v1.0
 * Converts CBScript line-by-line into executable Discord.js v14 JavaScript
 */

const COMMAND_MAP: Record<string, (args: string[], indent: number) => string> = {
  // Logical Flow
  if: (args) => `if (${args[0] || 'true'}) {`,
  elseif: (args) => `} else if (${args[0] || 'true'}) {`,
  else: () => `} else {`,
  endif: () => `}`,
  and: (args) => `(${args.join(' && ')})`,
  or: (args) => `(${args.join(' || ')})`,
  stop: () => `return;`,
  c: (args) => `// ${args[0] || ''}`,

  // IO Stream
  sendMessage: (args) => {
    const text = args[0] || ''
    const returnId = args[1]?.toLowerCase() === 'true'
    if (returnId) {
      return `const sentMessage = await message.channel.send(\`${escapeTemplate(text)}\`);`
    }
    return `await message.channel.send(\`${escapeTemplate(text)}\`);`
  },
  editMessage: (args) => {
    const [channelId, messageId, newText] = args
    return `await (await client.channels.fetch(\`${channelId}\`))?.messages.edit(\`${messageId}\`, \`${escapeTemplate(newText || '')}\`);`
  },
  deleteMessage: (args) => {
    const [channelId, messageId] = args
    return `await (await client.channels.fetch(\`${channelId}\`))?.messages.delete(\`${messageId}\`);`
  },
  reply: (args) => {
    const text = args[0] || ''
    const mention = args[1]?.toLowerCase() === 'true'
    return `await message.reply({ content: \`${escapeTemplate(text)}\`, allowedMentions: { repliedUser: ${mention} } });`
  },
  nomention: () => ``,
  suppressErrors: (args) => `try {`,
  alwaysReply: () => ``,
  message: () => `message.content`,
  noargs: () => `if (!args.length) return;`,
  argsCheck: (args) => {
    const [count, errMsg] = args
    return `if (args.length < ${count}) { await message.reply(\`${escapeTemplate(errMsg || 'Not enough arguments')}\`); return; }`
  },

  // Embeds
  createEmbed: () => `const __embed = new EmbedBuilder();`,
  title: (args) => {
    const [title, url] = args
    if (url) return `__embed.setTitle(\`${escapeTemplate(title)}\`).setURL(\`${url}\`);`
    return `__embed.setTitle(\`${escapeTemplate(title)}\`);`
  },
  description: (args) => `__embed.setDescription(\`${escapeTemplate(args[0] || '')}\`);`,
  color: (args) => `__embed.setColor(\`${args[0] || '#000000'}\`);`,
  addField: (args) => {
    const [title, desc, inline] = args
    return `__embed.addFields({ name: \`${escapeTemplate(title)}\`, value: \`${escapeTemplate(desc)}\`, inline: ${inline?.toLowerCase() === 'true'} });`
  },
  footer: (args) => {
    const [text, icon] = args
    if (icon) return `__embed.setFooter({ text: \`${escapeTemplate(text)}\`, iconURL: \`${icon}\` });`
    return `__embed.setFooter({ text: \`${escapeTemplate(text)}\` });`
  },
  author: (args) => {
    const [name, icon, url] = args
    let code = `__embed.setAuthor({ name: \`${escapeTemplate(name)}\``
    if (icon) code += `, iconURL: \`${icon}\``
    if (url) code += `, url: \`${url}\``
    return code + ` });`
  },
  image: (args) => `__embed.setImage(\`${args[0]}\`);`,
  thumbnail: (args) => `__embed.setThumbnail(\`${args[0]}\`);`,
  addTimestamp: () => `__embed.setTimestamp();`,

  // Variables (Database-backed, cross-script)
  getVar: (args) => {
    const [name, scopeId] = args
    if (scopeId) return `await client.cbscript.getVar(\`${name}\`, \`${scopeId}\`)`
    return `await client.cbscript.getVar(\`${name}\`, message.author.id)`
  },
  setVar: (args) => {
    const [name, value, scopeId] = args
    if (scopeId) return `await client.cbscript.setVar(\`${name}\`, \`${escapeTemplate(value)}\`, \`${scopeId}\`);`
    return `await client.cbscript.setVar(\`${name}\`, \`${escapeTemplate(value)}\`, message.author.id);`
  },
  addVar: (args) => {
    const [name, value, scopeId] = args
    if (scopeId) return `await client.cbscript.addVar(\`${name}\`, ${value}, \`${scopeId}\`);`
    return `await client.cbscript.addVar(\`${name}\`, ${value}, message.author.id);`
  },
  subVar: (args) => {
    const [name, value, scopeId] = args
    if (scopeId) return `await client.cbscript.subVar(\`${name}\`, ${value}, \`${scopeId}\`);`
    return `await client.cbscript.subVar(\`${name}\`, ${value}, message.author.id);`
  },
  resetVar: (args) => {
    const [name, scopeId] = args
    if (scopeId) return `await client.cbscript.resetVar(\`${name}\`, \`${scopeId}\`);`
    return `await client.cbscript.resetVar(\`${name}\`, message.author.id);`
  },
  getUserVar: (args) => `await client.cbscript.getVar(\`${args[0]}\`, \`${args[1]}\`)`,
  setUserVar: (args) => `await client.cbscript.setVar(\`${args[0]}\`, \`${escapeTemplate(args[1])}\`, \`${args[2]}\`);`,
  getGuildVar: (args) => `await client.cbscript.getVar(\`${args[0]}\`, \`guild_\${message.guild?.id}\`)`,
  setGuildVar: (args) => `await client.cbscript.setVar(\`${args[0]}\`, \`${escapeTemplate(args[1])}\`, \`guild_\${message.guild?.id}\`);`,

  // Entity Metadata
  authorID: () => `message.author.id`,
  authorTag: () => `message.author.tag`,
  username: (args) => {
    if (args[0]) return `(await client.users.fetch(\`${args[0]}\`))?.username`
    return `message.author.username`
  },
  nickname: (args) => {
    if (args[0] && args[1]) return `(await (await client.guilds.fetch(\`${args[1]}\`)).members.fetch(\`${args[0]}\`))?.nickname`
    if (args[0]) return `(await message.guild?.members.fetch(\`${args[0]}\`))?.nickname`
    return `message.member?.nickname || message.author.username`
  },
  userAvatar: (args) => {
    if (args[0]) return `(await client.users.fetch(\`${args[0]}\`))?.displayAvatarURL()`
    return `message.author.displayAvatarURL()`
  },
  userJoined: (args) => {
    if (args[0]) return `(await message.guild?.members.fetch(\`${args[0]}\`))?.joinedAt`
    return `message.member?.joinedAt`
  },
  userRoles: (args) => {
    if (args[0]) return `Array.from((await message.guild?.members.fetch(\`${args[0]}\`))?.roles.cache.keys() || [])`
    return `Array.from(message.member?.roles.cache.keys() || [])`
  },
  bot: () => `message.author.bot`,
  isBanned: (args) => {
    const userId = args[0] || 'message.author.id'
    return `(await message.guild?.bans.fetch(\`${userId}\`).catch(() => null)) !== null`
  },

  // Moderation
  ban: (args) => {
    const [userId, reason, deleteDays] = args
    let code = `await message.guild?.members.ban(\`${userId}\``
    if (reason) code += `, { reason: \`${escapeTemplate(reason)}\``
    if (deleteDays) code += `, deleteMessageDays: ${deleteDays}`
    if (reason) code += ` }`
    return code + `);`
  },
  kick: (args) => {
    const [userId, reason] = args
    const member = `await message.guild?.members.fetch(\`${userId}\`)`
    return `await (${member})?.kick(\`${escapeTemplate(reason || '')}\`);`
  },
  giveRole: (args) => {
    const [userId, roleId] = args
    return `await (await message.guild?.members.fetch(\`${userId}\`))?.roles.add(\`${roleId}\`);`
  },
  takeRole: (args) => {
    const [userId, roleId] = args
    return `await (await message.guild?.members.fetch(\`${userId}\`))?.roles.remove(\`${roleId}\`);`
  },
  createChannel: (args) => {
    const [name, type, categoryId, reason] = args
    let code = `await message.guild?.channels.create({ name: \`${escapeTemplate(name)}\`, type: ${type === 'voice' ? 'ChannelType.GuildVoice' : 'ChannelType.GuildText'}`
    if (categoryId) code += `, parent: \`${categoryId}\``
    if (reason) code += `, reason: \`${escapeTemplate(reason)}\``
    return code + ` });`
  },
  removeChannel: (args) => {
    const [channelId, reason] = args
    return `await (await client.channels.fetch(\`${channelId}\`))?.delete(\`${escapeTemplate(reason || '')}\`);`
  },
  channelTyping: (args) => {
    const channelId = args[0]
    if (channelId) return `await (await client.channels.fetch(\`${channelId}\`))?.sendTyping();`
    return `await message.channel.sendTyping();`
  },
  pinMessage: (args) => {
    const [channelId, messageId] = args
    return `await (await client.channels.fetch(\`${channelId}\`))?.messages.pin(\`${messageId}\`);`
  },

  // Arithmetic
  calculate: (args) => {
    try {
      const expr = args[0]?.replace(/[^0-9+\-*/().\s]/g, '') || '0'
      return `${eval(expr)}`
    } catch {
      return `0`
    }
  },
  random: (args) => {
    const [min, max] = args.map(Number)
    return `Math.floor(Math.random() * (${max} - ${min} + 1)) + ${min}`
  },
  round: (args) => {
    const [num, decimals] = args
    if (decimals) return `Number(${num}).toFixed(${decimals})`
    return `Math.round(${num})`
  },
  ceil: (args) => `Math.ceil(${args[0]})`,
  floor: (args) => `Math.floor(${args[0]})`,
  sqrt: (args) => `Math.sqrt(${args[0]})`,
  abs: (args) => `Math.abs(${args[0]})`,

  // JSON
  jsonParse: (args) => `JSON.parse(\`${escapeTemplate(args[0] || '{}')}\`)`,
  jsonSetString: (args) => {
    const [key, value] = args
    return `(() => { if (!global.__jsonStore) global.__jsonStore = {}; global.__jsonStore[\`${key}\`] = \`${escapeTemplate(value)}\`; return global.__jsonStore; })()`
  },
  jsonStringify: () => `JSON.stringify(global.__jsonStore || {})`,
  json: (args) => `(global.__jsonStore || {})[\`${args[0]}\`]`,

  // Interactions
  addButton: (args) => {
    const [style, customId, label, emoji, disabled] = args
    const styleMap: Record<string, string> = {
      primary: 'ButtonStyle.Primary',
      secondary: 'ButtonStyle.Secondary',
      success: 'ButtonStyle.Success',
      danger: 'ButtonStyle.Danger',
      link: 'ButtonStyle.Link',
    }
    let code = `new ButtonBuilder().setStyle(${styleMap[style?.toLowerCase()] || 'ButtonStyle.Primary'}).setCustomId(\`${customId}\`).setLabel(\`${escapeTemplate(label)}\`)`
    if (emoji) code += `.setEmoji(\`${emoji}\`)`
    if (disabled?.toLowerCase() === 'true') code += `.setDisabled(true)`
    return code
  },
  addSelectMenuOption: (args) => {
    const [customId, label, value, description, emoji, isDefault] = args
    let code = `new StringSelectMenuOptionBuilder().setLabel(\`${escapeTemplate(label)}\`).setValue(\`${value}\`)`
    if (description) code += `.setDescription(\`${escapeTemplate(description)}\`)`
    if (emoji) code += `.setEmoji(\`${emoji}\`)`
    if (isDefault?.toLowerCase() === 'true') code += `.setDefault(true)`
    return code
  },
  addTextInput: (args) => {
    const [customId, label, style, required, minLength, maxLength, placeholder] = args
    const styleMap: Record<string, string> = {
      short: 'TextInputStyle.Short',
      paragraph: 'TextInputStyle.Paragraph',
    }
    let code = `new TextInputBuilder().setCustomId(\`${customId}\`).setLabel(\`${escapeTemplate(label)}\`).setStyle(${styleMap[style?.toLowerCase()] || 'TextInputStyle.Short'})`
    if (required?.toLowerCase() === 'true') code += `.setRequired(true)`
    if (minLength) code += `.setMinLength(${minLength})`
    if (maxLength) code += `.setMaxLength(${maxLength})`
    if (placeholder) code += `.setPlaceholder(\`${escapeTemplate(placeholder)}\`)`
    return code
  },

  // System Metrics
  ping: () => `client.ws.ping`,
  executionTime: () => `Date.now() - __startTime`,
  botOwnerID: () => `process.env.BOT_OWNER_ID || 'unknown'`,
  serverID: () => `message.guild?.id`,
  serverName: () => `message.guild?.name`,
  channelsCount: () => `message.guild?.channels.cache.size`,
  membersCount: () => `message.guild?.memberCount`,
  emojisCount: () => `message.guild?.emojis.cache.size`,
}

function escapeTemplate(str: string): string {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$')
}

function parseLine(line: string): CBScriptCommand | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//')) return null
  if (!trimmed.startsWith('<nif ')) return null

  const inner = trimmed.slice(5)
  const braceIndex = inner.indexOf('{')

  let command: string
  let args: string[] = []

  if (braceIndex === -1) {
    command = inner.trim()
  } else {
    command = inner.slice(0, braceIndex).trim()
    const argsStr = inner.slice(braceIndex + 1)
    if (argsStr.endsWith('}')) {
      const content = argsStr.slice(0, -1)
      args = parseArgs(content)
    }
  }

  return {
    opcode: `0x${Buffer.from(command).toString('hex').slice(0, 4).toUpperCase()}`,
    command,
    args,
    raw: trimmed,
  }
}

function parseArgs(content: string): string[] {
  const args: string[] = []
  let current = ''
  let depth = 0

  for (const char of content) {
    if (char === '{') {
      depth++
      current += char
    } else if (char === '}') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) args.push(current.trim())
  return args
}

const EMBED_COMMANDS = ['title', 'description', 'color', 'addField', 'footer', 'author', 'image', 'thumbnail', 'addTimestamp']

export function transpileCBScript(cbscriptCode: string, options: TranspilerOptions): { javascript: string; errors: string[] } {
  const lines = cbscriptCode.split('\n')
  const errors: string[] = []
  const output: string[] = []
  let indentLevel = 1
  let inEmbed = false
  let inTryBlock = false

  output.push(`// Auto-generated by CBScript Transpiler v1.0`)
  output.push(`// Bot ID: ${options.botId} | Script ID: ${options.scriptId}`)
  output.push(`const { EmbedBuilder, ButtonBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, ButtonStyle, TextInputStyle, ChannelType, ActionRowBuilder } = require('discord.js');`)
  output.push(`module.exports = async function(__ctx) {`)
  output.push(`  const { client, message, interaction, args } = __ctx;`)
  output.push(`  const __startTime = Date.now();`)
  output.push(`  let __replySent = false;`)
  output.push(`  let __embed = null;`)
  output.push(`  global.__jsonStore = global.__jsonStore || {};`)
  output.push(``)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const cmd = parseLine(line)

    if (!cmd) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('<nif')) {
        errors.push(`Line ${lineNum}: Unknown syntax "${trimmed.slice(0, 30)}..."`)
      }
      continue
    }

    const handler = COMMAND_MAP[cmd.command]

    if (!handler) {
      errors.push(`Line ${lineNum}: Unknown command "${cmd.command}"`)
      continue
    }

    if (inEmbed && cmd.command !== 'createEmbed' && !EMBED_COMMANDS.includes(cmd.command)) {
      output.push(`  ${'  '.repeat(indentLevel)}if (__embed) {`)
      output.push(`  ${'  '.repeat(indentLevel + 1)}await message.channel.send({ embeds: [__embed] });`)
      output.push(`  ${'  '.repeat(indentLevel)}__embed = null;`)
      output.push(`  ${'  '.repeat(indentLevel)}}`)
      inEmbed = false
    }

    if (cmd.command === 'suppressErrors') {
      inTryBlock = true
    }

    try {
      let jsLine = handler(cmd.args, indentLevel)

      if (['if', 'elseif', 'else', 'endif'].includes(cmd.command)) {
        if (cmd.command === 'endif') indentLevel = Math.max(0, indentLevel - 1)
        output.push(`  ${'  '.repeat(indentLevel)}${jsLine}`)
        if (['if', 'elseif', 'else'].includes(cmd.command)) indentLevel++
      } else if (cmd.command === 'createEmbed') {
        output.push(`  ${'  '.repeat(indentLevel)}${jsLine}`)
        inEmbed = true
      } else if (cmd.command === 'c') {
        output.push(`  ${'  '.repeat(indentLevel)}${jsLine}`)
      } else {
        const isExpression = ['authorID', 'authorTag', 'username', 'nickname', 'userAvatar', 'userJoined', 'userRoles', 'bot', 'isBanned', 'ping', 'executionTime', 'botOwnerID', 'serverID', 'serverName', 'channelsCount', 'membersCount', 'emojisCount', 'calculate', 'random', 'round', 'ceil', 'floor', 'sqrt', 'abs', 'jsonParse', 'jsonStringify', 'json', 'getVar', 'setVar', 'addVar', 'subVar', 'resetVar', 'getUserVar', 'setUserVar', 'getGuildVar', 'setGuildVar'].includes(cmd.command)

        if (isExpression) {
          output.push(`  ${'  '.repeat(indentLevel)}const __result_${lineNum} = ${jsLine};`)
        } else {
          output.push(`  ${'  '.repeat(indentLevel)}${jsLine}`)
        }
      }
    } catch (err: any) {
      errors.push(`Line ${lineNum}: Transpilation error - ${err.message}`)
    }
  }

  if (inEmbed) {
    output.push(`  ${'  '.repeat(indentLevel)}if (__embed) {`)
    output.push(`  ${'  '.repeat(indentLevel + 1)}await message.channel.send({ embeds: [__embed] });`)
    output.push(`  ${'  '.repeat(indentLevel)}}`)
  }

  while (indentLevel > 0) {
    indentLevel--
    output.push(`  ${'  '.repeat(indentLevel)}}`)
  }

  if (inTryBlock) {
    output.push(`  } catch (__err) {`)
    output.push(`    console.error('CBScript Error:', __err);`)
    output.push(`  }`)
  }

  output.push(`};`)

  return {
    javascript: output.join('\n'),
    errors,
  }
}

export function wrapInEventHandler(jsCode: string, trigger: string, isSlash: boolean, slashTrigger?: string): string {
  if (isSlash && slashTrigger) {
    return `${jsCode}\nmodule.exports.event = 'interactionCreate';\nmodule.exports.slashTrigger = '${slashTrigger}';\nmodule.exports.isSlash = true;`
  }
  return `${jsCode}\nmodule.exports.event = '${trigger}';\nmodule.exports.isSlash = false;`
}
