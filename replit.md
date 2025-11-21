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
package.json           - Dependencies
.env                   - Secrets (TOKEN, CLIENT_ID, etc.)
public/
  ├── dashboard-sleek.html  - Admin dashboard
  ├── index.html            - Homepage
  ├── features.html         - Features page
  └── assets/               - Logo and banner images
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
- **How to deploy**: 
  1. Push code to Render git repo
  2. Render auto-deploys on git push
  3. Set environment variables in Render dashboard

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
- ✅ Added @Members role restriction to all commands
- ✅ Transformed all embeds to Tron aesthetic (cyan #00D4FF)
- ✅ Added GET endpoints for all 18 config pages
- ✅ Dashboard now loads existing server settings
- ✅ Auto-load Recent Activity, Active Members on page load
- ✅ Settings page now saves properly
- ✅ 40+ API endpoints fully functional
- ✅ Per-server configuration system complete

## Next Steps
1. Deploy to Render via git push
2. Monitor performance in production
3. Collect user feedback on dashboard UX

## Support
For issues or feature requests, use //help or contact via Discord support

