# CBScript Bot Designer

A full-stack Discord bot designer using the custom **CBScript** language. Similar to BDFD, but transpiles CBScript line-by-line into JavaScript and runs real Discord.js bots.

## Features
- Discord OAuth2 Login
- iOS 18-inspired UI (tinted, rounded, animated)
- CBScript -> JavaScript transpiler
- Real-time bot hosting
- Cross-script Variables (database-backed)
- GitHub file storage for scripts
- Slash command support
- Ad-based hosting credits (+1 day per ad)

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Discord.js v14
- NextAuth.js (Discord Provider)
- Octokit (GitHub API)

## Project Structure

```
cbscript-bot-designer/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts   # Discord OAuth
│   │   │   └── bots/
│   │   │       ├── route.ts                  # List / Create bots
│   │   │       └── [id]/
│   │   │           ├── route.ts              # Get / Update / Delete bot
│   │   │           ├── scripts/route.ts      # List / Create scripts
│   │   │           ├── variables/route.ts    # List / Create variables
│   │   │           └── hosting/route.ts      # Start / Stop / Watch Ad
│   │   ├── bot/[id]/page.tsx                 # Bot management UI
│   │   ├── dashboard/page.tsx                # Bot list / Add bot
│   │   ├── globals.css                       # iOS 18 Tailwind styles
│   │   ├── layout.tsx                        # Root layout
│   │   └── page.tsx                          # Login screen
│   ├── components/
│   │   └── Providers.tsx                     # NextAuth + Toast provider
│   ├── lib/
│   │   ├── bot-manager.ts                    # Discord.js client runner
│   │   ├── cbscript-transpiler.ts             # CBScript -> JS engine
│   │   ├── discord-oauth.ts                   # Discord API helpers
│   │   ├── github.ts                          # GitHub storage API
│   │   └── prisma.ts                          # Prisma client
│   └── types/
│       └── index.ts                           # TypeScript types
├── .env.example
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Setup

### 1. Clone and install
```bash
git clone <your-repo>
cd cbscript-bot-designer
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:

```env
# Discord OAuth2 (from https://discord.com/developers/applications)
DISCORD_CLIENT_ID=your_discord_app_client_id
DISCORD_CLIENT_SECRET=your_discord_app_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_at_least_32_chars

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/cbscript?schema=public"

# GitHub (for script file storage)
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=cbscript-bots-storage

# App Config
HOSTING_CREDIT_DAYS_PER_AD=1
```

### 3. Discord App Setup
1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to OAuth2 -> General
4. Add Redirect: `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret to `.env.local`
6. Go to Bot -> Add Bot -> Copy Token (this is what users paste when creating a bot)

### 4. Database
```bash
npx prisma generate
npx prisma db push
```

### 5. Run
```bash
npm run dev
```

Open http://localhost:3000

## CBScript Language Reference

### Example Script
```cbscript
<nif if{args[0]==hello}
<nif sendMessage{Hello there!}
<nif elseif{args[0]==bye}
<nif sendMessage{Goodbye!}
<nif else
<nif sendMessage{I don't understand}
<nif endif
```

### Commands
| Command | Description | Example |
|---------|-------------|---------|
| `sendMessage` | Send a message | `<nif sendMessage{Hello!}` |
| `reply` | Reply to a message | `<nif reply{Hi!,true}` |
| `createEmbed` | Start an embed | `<nif createEmbed` |
| `title` | Set embed title | `<nif title{My Title,https://url}` |
| `description` | Set embed description | `<nif description{Some text}` |
| `color` | Set embed color | `<nif color{#FF0000}` |
| `addField` | Add embed field | `<nif addField{Name,Value,true}` |
| `if` | Conditional | `<nif if{args[0]==hello}` |
| `elseif` | Else if | `<nif elseif{args[0]==bye}` |
| `else` | Else block | `<nif else` |
| `endif` | End if | `<nif endif` |
| `getVar` | Get variable | `<nif getVar{score}` |
| `setVar` | Set variable | `<nif setVar{score,100}` |
| `addVar` | Add to variable | `<nif addVar{score,10}` |
| `subVar` | Subtract from variable | `<nif subVar{score,5}` |
| `resetVar` | Reset variable | `<nif resetVar{score}` |
| `authorID` | Get author ID | `<nif authorID` |
| `username` | Get username | `<nif username` |
| `ping` | Get bot ping | `<nif ping` |
| `calculate` | Math expression | `<nif calculate{5+5}` |
| `random` | Random number | `<nif random{1,100}` |

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import to Vercel
3. Add all environment variables
4. Deploy

### Database
Use Supabase, Railway, or Neon for PostgreSQL.

### Bot Hosting
The bot runner (`bot-manager.ts`) creates real Discord.js clients. For 24/7 hosting:
- **Option A**: Deploy on a VPS (DigitalOcean, Linode, AWS EC2)
- **Option B**: Use Railway/Render for the full app (supports long-running processes)
- **Option C**: Separate the bot runner into a standalone service

**Note**: Vercel serverless functions have a 10s timeout, so bot hosting won't work there. Use Railway or a VPS for the full stack.

## License
MIT - Built to help people make Discord bots easily.
