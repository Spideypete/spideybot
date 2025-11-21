# SPIDEY BOT - Complete Discord Bot

## Overview
SPIDEY BOT is a feature-rich, multi-server Discord bot with music playback, moderation, economy system, leveling, social media monitoring, and 40+ commands. Built with Node.js and discord.js, deployed on Render for 24/7 uptime.

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

## Tech Stack
- **Language**: Node.js (CommonJS)
- **Discord**: discord.js v14
- **Web**: Express.js, express-session
- **API**: Axios for HTTP requests
- **Music**: discord-player, youtube-sr, @discord-player/extractor
- **Database**: JSON-based config (config.json)

## Project Structure
```
index.cjs              - Main bot file (3200+ lines)
config.json            - Server configurations
package.json           - Dependencies
.env                   - Secrets (TOKEN, CLIENT_ID, etc.)
public/assets/         - Logo and banner images
```

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
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret (for admin dashboard)
- `SESSION_SECRET` - Session encryption key
- `OPENAI_API_KEY` - For AI chatbot support

## Website Routes
- `/` - Homepage with features & invite button
- `/features` - Detailed features page
- `/commands` - Command reference
- `/auth/discord` - Discord login
- `/dashboard` - Admin server list (requires login)
- `/dashboard/server/:guildId` - Server configuration
- `/api/config/:guildId` - Config API (POST to save settings)

## Admin Dashboard Features
Admins can manage:
- Command prefix per server
- Welcome messages with placeholders
- Social media alert channels (Twitch/TikTok/Kick)
- Moderation log channel
- All settings auto-save to config.json

## User Preferences
- Prefix: `//` (configurable per server)
- Color scheme: Dark (#0f0f0f), Purple accent (#9146FF)
- Font: Inter (website), Fredoka (some pages)
- Notifications: Custom format "{username} is live with {viewers} viewers please support and follow thanks!"

## Recent Changes (November 21, 2025)
- ✅ Added Discord OAuth authentication
- ✅ Created admin dashboard for server management
- ✅ Implemented per-server config via web interface
- ✅ Added express-session for secure sessions
- ✅ Updated homepage with mee6-style design
- ✅ Added login button to navigation
- ✅ Configured Render deployment with auto-detected URLs
- ✅ Completed help command with all admin features documented

## Next Steps
1. Add DISCORD_CLIENT_SECRET to environment variables
2. Test OAuth login on Replit
3. Deploy to Render
4. Monitor bot performance

## Support
For issues or feature requests, check the Discord support chatbot (💬 button on website)
