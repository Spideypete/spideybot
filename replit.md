# SPIDEY BOT - Complete Discord Bot

## Overview
SPIDEY BOT is a feature-rich, multi-server Discord bot with music playback, moderation, economy system, leveling, social media monitoring, and 40+ commands. Built with Node.js and discord.js, deployed on Render for 24/7 uptime. Includes a professional Tron-inspired admin dashboard with neon cyan aesthetics.

## Current Features (✅ Completed)
- **🎵 Music Player** - YouTube search, queue, loop, shuffle, volume control
- **🛡️ Moderation** - Kick, ban, warn, mute with auto-logging
- **🎭 Role Management** - Custom categories with GIF banners & interactive selectors
- **📱 Social Media** - Monitor unlimited Twitch, TikTok, Kick streamers with auto-alerts
- **💰 Economy System** - Daily rewards, work commands, transfers, leaderboard
- **📈 Leveling/XP** - Passive XP gains, auto-assigned level roles (1-100) with emoji badges
- **👋 Welcome Messages** - Custom messages with placeholders
- **🎫 Ticket Support** - Member support tickets
- **🔐 Discord OAuth Login** - Website admin dashboard for server management
- **⚙️ Per-Server Configuration** - Each server has independent settings
- **🎨 Tron Aesthetic** - Neon cyan (#00D4FF) embeds, cyberpunk design throughout
- **🔐 @Members Role Restriction** - Only @Members role can use bot commands

## Tech Stack
- **Language**: Node.js (CommonJS)
- **Discord**: discord.js v14
- **Web**: Express.js, express-session
- **API**: Axios for HTTP requests
- **Music**: discord-player, youtube-sr, @discord-player/extractor
- **Database**: JSON-based config (config.json)

## Project Structure
```
index.cjs              - Main bot file (3900+ lines)
config.json            - Server configurations
package.json           - Dependencies (Express + React components)
.env                   - Secrets (TOKEN, CLIENT_ID, etc.)
src/
  ├── api/              - API integrations (bot.ts, discord.ts)
  ├── components/       - React components (forms, charts, features)
  ├── pages/            - Dashboard pages
  ├── config/           - Configuration files
  ├── utils/            - Utility functions
  ├── stores/           - State management (Zustand)
  ├── styles/           - CSS/theme styles
  └── theme/            - Theme configuration
public/
  ├── dashboard-sleek.html  - Admin dashboard (legacy)
  ├── admin-panel.html      - Server dashboard
  ├── index.html            - Homepage
  ├── features.html         - Features page
  └── assets/               - Logo and banner images
document/              - Documentation and guides
```

## API Endpoints (40+)

### Authentication
- `GET /auth/discord` - Discord OAuth login
- `GET /auth/discord/callback` - OAuth callback
- `POST /logout` - Logout

### Dashboard APIs
- `GET /api/dashboard/stats` - Server statistics
- `GET /api/dashboard/analytics` - Growth & retention data
- `GET /api/dashboard/members` - Top members by XP
- `GET /api/dashboard/activity` - Recent activity feed
- `GET /api/dashboard/growth` - Member growth trends
- `GET /api/dashboard/active-members` - Weekly activity
- `GET /api/dashboard/statistics` - Overall statistics
- `GET /api/dashboard/top-members` - Leaderboard

### Configuration APIs (Per-Server)
- `GET /api/config/{pageName}` - Load config for any page
- `POST /api/config/{pageName}` - Save config for any page
- Config pages: settings, subscriptions, logging, server-guard, react-roles, role-categories, server-messages, components, custom-commands, recordings, reminders, leaderboards, invite-tracking, message-counting, statistics-channels, xp-levels, giveaways, social-notifs

### Webhooks
- `POST /webhooks/twitch` - Twitch live notifications
- `POST /webhooks/tiktok` - TikTok post notifications

## Deployment

### Render Deployment ✅
- **Live URL**: https://spideybot-90sr.onrender.com
- **Redirect URI**: https://spideybot-90sr.onrender.com/auth/discord/callback
- **Discord OAuth Setup**: See RENDER_DEPLOYMENT.md for complete instructions
- **How to deploy**: 
  1. Create Web Service on Render (connect GitHub repo)
  2. Add environment variables: TOKEN, CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET
  3. Register Discord redirect URI: https://your-app-name.onrender.com/auth/discord/callback
  4. Push code to GitHub - Render auto-deploys
  5. Visit your Render URL and login with Discord

### Local Development (Replit)
- **Testing URL**: https://[replit-domain]/
- **OAuth Redirect**: https://[replit-domain]/auth/discord/callback
- Command: `node index.cjs`

## Required Environment Variables
- `TOKEN` - Discord bot token
- `CLIENT_ID` - Discord app client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- `SESSION_SECRET` - Session encryption key (auto-generated if missing)
- `OPENAI_API_KEY` - For AI chatbot support

## Website Routes
- `/` - Homepage with features & invite button
- `/features` - Detailed features page
- `/commands` - Command reference
- `/auth/discord` - Discord login
- `/dashboard` - Admin server list (requires login)
- `/dashboard/server/:guildId` - Server configuration
- `/api/config/*` - Configuration API endpoints

## Admin Dashboard Features
Admins can manage:
- ⚙️ **Settings** - Command prefix, language, channels
- 💳 **Subscriptions** - Premium tiers & features
- 📝 **Logging** - Moderation logs, message tracking
- 🛡️ **Server Guard** - Anti-spam, raid protection
- 🎭 **React Roles** - Reaction-based role assignment
- 📂 **Role Categories** - Custom role groups with banners
- 💬 **Server Messages** - Welcome, goodbye messages
- 🎯 **Custom Commands** - User-defined commands
- 🎁 **Giveaways** - Prize giveaway management
- 📊 **Social Notifs** - Twitch/TikTok monitoring
- And 9 more configuration pages

All settings auto-save to config.json and load per-server from dashboard.

## Bot Restrictions
- **@Members Role Only** - All commands (starting with //) require @Members role
- **Auto XP** - Gain 10-30 XP per minute of chat activity
- **Level System** - Level up every 500 XP, unlock level-based roles

## Dashboard Features
- 🎨 **Tron Cyberpunk Aesthetic** - Neon cyan colors, grid patterns, glowing effects
- 📊 **Real-time Analytics** - Live stats, member activity, growth charts
- 👥 **Member Management** - View leaderboards, stats, levels
- ⚙️ **18 Config Pages** - Manage all bot features
- 🔄 **Auto-Load/Save** - Forms load existing config and auto-save changes
- 📱 **Responsive Design** - Works on desktop and mobile

## User Preferences
- Prefix: `//` (configurable per server)
- Color scheme: Tron-inspired (neon cyan #00D4FF on dark background)
- Font: Inter (website & dashboard)
- Aesthetic: Cyberpunk with subtle grid patterns & glowing effects

## Recent Changes (November 21, 2025)
- ✅ Renamed creator from "DARKIE" to "spidey"
- ✅ Added server selector modal (must choose server before accessing panels)
- ✅ Created `/api/creator/servers` endpoint (fetches real Discord servers bot is in)
- ✅ Created `/api/creator/settings` API (bot nickname + timezone management)
- ✅ Creator Panel with Bot Nickname & Timezone (GMT) fields
- ✅ Removed logging channels from Settings panel
- ✅ Font size reduced 20% (text more compact)
- ✅ All admin configuration pages with 18 categories working
- ✅ Production APIs fully functional and tested
- ✅ Discord OAuth login with session authentication
- ✅ Per-server configuration system complete

## How to Access Admin Panel
1. **Login with Discord**: Visit `/login` to authenticate with Discord OAuth
2. **Select Server**: Choose which server to configure (shows real servers bot is in)
3. **Access Dashboard**: Navigate `/dashboard` - complete admin panel with 18 categories
4. **Creator Access**: Only "spidey" user can access Creator Panel for bot settings
5. **Configuration**: All settings auto-save via API endpoints to config.json

## 🚀 DEPLOYMENT CHECKLIST (READY FOR LIVE)

### Prerequisites ✅
- Bot code fully functional and tested locally
- All APIs working (dashboard, creator, config)
- Discord OAuth configured
- config.json with creator settings
- Environment variables ready

### Step 1: GitHub Setup (YOU DO THIS)
```bash
git add -A
git commit -m "SPIDEY BOT production ready - all features implemented"
git push origin main
```

### Step 2: Render Configuration (YOU DO THIS)
1. Go to https://dashboard.render.com
2. Create/select "spideybot-90sr" Web Service
3. Connect to your GitHub repo
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node index.cjs`

### Step 3: Environment Variables in Render (YOU DO THIS)
Add these in Render dashboard → Environment:
```
TOKEN = [your Discord bot token]
CLIENT_ID = [your Discord app Client ID]
DISCORD_CLIENT_SECRET = [your Discord app Client Secret]
SESSION_SECRET = [generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
OPENAI_API_KEY = [optional, for AI features]
```

### Step 4: Discord OAuth Setup (YOU DO THIS)
1. Go to Discord Developer Portal → Your App → OAuth2
2. Add these Redirect URIs:
   - `https://spideybot-90sr.onrender.com/auth/discord/callback`
   - `https://spideybot-90sr.onrender.com/login`
3. Save changes

### Step 5: Deploy (YOU DO THIS)
- Push code to GitHub (Step 1)
- Render auto-deploys when it detects changes
- Monitor deployment in Render dashboard

### Step 6: Test Live (YOU DO THIS)
- Visit: https://spideybot-90sr.onrender.com
- Login with Discord
- Select your server
- Test admin panel functionality

✅ **STATUS**: PRODUCTION READY - Just push to GitHub!

## Quick Render Setup Checklist
- [ ] Create Render account
- [ ] Connect GitHub repo to Render
- [ ] Add environment variables in Render dashboard
- [ ] Register Discord OAuth redirect URI for Render domain
- [ ] Deploy and test login on Render URL
- [ ] Verify bot is running 24/7

## Support
For issues or feature requests, use //help or contact via Discord support

