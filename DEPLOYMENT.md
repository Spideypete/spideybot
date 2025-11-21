# SPIDEY BOT - Deployment Guide

## Quick Start

### Prerequisites
1. ✅ Discord bot created in Discord Developer Portal
2. ✅ Bot TOKEN (already have)
3. ✅ Client ID (already have)
4. ✅ Client Secret (need to get)
5. ✅ Render account (https://render.com)

## Step 1: Get Discord Client Secret

1. Go to https://discord.com/developers/applications
2. Select **SPIDEY BOT** application
3. Click **"OAuth2"** → **"General"**
4. Under "Client Secret", click **"Reset Secret"**
5. **Copy the secret** and save it safely

## Step 2: Add OAuth Redirect URLs to Discord

1. Still in OAuth2 → General
2. Find **"Redirects"** section
3. Click **"Add Redirect"** and add **BOTH** URLs:
   - **For Replit testing**: `https://b17c56dd-97ae-4115-89ec-0ae9cc59baae-00-2qrrb57gp09hi.picard.replit.dev/auth/discord/callback`
   - **For Render production**: `https://spideybot-90sr.onrender.com/auth/discord/callback`
4. Click **"Save Changes"**

## Step 3: Deploy to Render

### If you haven't connected Render yet:

1. Go to https://render.com and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in:
   - **Name**: spidey-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.cjs`
   - **Region**: Choose closest to you
5. Click **"Create Web Service"**

### Add Environment Variables to Render:

1. In Render dashboard, go to your **spidey-bot** service
2. Click **"Environment"** tab
3. Add these variables:
   ```
   TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   SESSION_SECRET=any_random_string_here
   OPENAI_API_KEY=your_openai_key_here (optional for chatbot)
   ```
4. Click **"Save"**
5. Render will auto-deploy

### Push Code to Render:

```bash
git add .
git commit -m "Add Discord OAuth and admin dashboard"
git push
```

Render will automatically deploy when you push!

## Step 4: Test It Out

### Test on Render:
1. Go to https://spideybot-90sr.onrender.com
2. Click **"🔐 Login with Discord"**
3. Authorize the bot
4. You should see your servers in the dashboard
5. Click **"Configure"** to manage a server

### Test Locally (Replit):
1. Make sure your bot is running
2. Click **"🔐 Login with Discord"** on Replit preview
3. Should work the same way

## Troubleshooting

### "Invalid OAuth2 redirect_uri"
- ✅ Check you added BOTH URLs to Discord Developer Portal
- ✅ Make sure URLs exactly match (no typos)
- ✅ Click "Save Changes" in Discord

### "Bot not responding"
- ✅ Check TOKEN is correct in environment variables
- ✅ Check bot has proper intents in Discord Developer Portal
- ✅ Restart the bot with `git push` or manually in Render

### Login not working
- ✅ Check DISCORD_CLIENT_SECRET is set
- ✅ Check your redirect URLs match in Discord
- ✅ Clear browser cookies and try again

## What's Working Now

✅ Website with mee6-style design
✅ Discord OAuth login
✅ Admin dashboard showing your servers
✅ Per-server configuration interface
✅ Automatic environment detection (Replit vs Render)
✅ 40+ Discord commands
✅ Music player, moderation, economy, leveling, social media
✅ 24/7 uptime on Render

## Commands for Admins

In Discord:
- `//help` - Show all user commands
- `//adminhelp` - Show all admin commands
- `//setup-level-roles` - Create 100 level roles
- `//config-welcome-channel #channel` - Set welcome channel
- `//add-twitch-user [username]` - Add Twitch monitoring

On Website:
- `/dashboard` - View your servers
- `/dashboard/server/:guildId` - Configure a server

## Support

If you have issues:
1. Check this guide step-by-step
2. Verify all environment variables are set
3. Check Discord bot has proper intents enabled
4. Check bot is in your server with admin permissions
5. Restart the bot by pushing code again
