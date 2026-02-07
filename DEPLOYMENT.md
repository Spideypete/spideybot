# SPIDEY BOT - Render Deployment Guide

## Prerequisites
- Discord bot created in Discord Developer Portal
- Bot TOKEN from Discord Developer Portal
- Client ID: `1441151515233615964`
- Client Secret from Discord Developer Portal
- Render account (https://render.com)
- GitHub repository with code pushed

## Step 1: Get Discord Credentials

1. Go to https://discord.com/developers/applications
2. Select **SPIDEY BOT** application
3. Click **"OAuth2"** → **"General"**
4. Copy **Client ID**: `1441151515233615964`
5. Click **"Reset Secret"** under Client Secret and copy it
6. Save both securely

## Step 2: Set OAuth Redirect URL in Discord

1. Still in OAuth2 → General
2. Under **"Valid OAuth2 Redirect URIs"**
3. Add: `https://your-service-name.onrender.com/auth/discord/callback`
   - Replace `your-service-name` with your actual Render service name
   - You can update this after deployment if needed
4. Click **"Save Changes"**

## Step 3: Deploy to Render

### Option A: Using render.yaml (Automatic - Recommended)

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and configure everything
5. Click **"Create Web Service"**
6. Add environment variables (see below)

### Option B: Manual Configuration

1. Go to Render and create a new **Web Service**
2. Configure:
   - **Name**: spidey-bot
   - **Runtime**: Node
   - **Build Command**: `npm install --no-audit --no-fund`
   - **Start Command**: `node index.cjs`
   - **Plan**: Free (or paid for persistent storage)

### Set Environment Variables in Render:

1. In Render dashboard, click **"Settings"** on your service
2. Scroll to **"Environment"** section
3. Add these variables:
   ```
   TOKEN=your_discord_bot_token
   CLIENT_ID=1441151515233615964
   DISCORD_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=generate_a_random_string_here
   BASE_URL=https://your-service-name.onrender.com
   NODE_ENV=production
   PORT=5000
   ```

## Step 4: Verify Deployment

1. Render builds and deploys (takes 2-5 minutes)
2. Once live, test:
   - Homepage: `https://your-service.onrender.com/`
   - Commands: `https://your-service.onrender.com/commands`
   - API: `https://your-service.onrender.com/api/commands`
3. Check Render logs for "✅ Registered X slash commands"
4. Invite bot to Discord and type `/` to see commands

## Troubleshooting Render Deployment

### Build fails: "npm ERR!"
- Check Node version (should be 18+)
- Ensure `package.json` is valid
- Run locally: `npm install` to verify

### Bot doesn't login: "TokenInvalid"
- Verify TOKEN environment variable is set correctly
- Check token hasn't been rotated/revoked in Discord Developer Portal
- Ensure no extra spaces in the token value

### OAuth fails: Redirect URI mismatch
- Update Discord redirect URI to match your Render service URL
- Format: `https://spidey-bot-xxxxx.onrender.com/auth/discord/callback`
- Clear browser cache and retry login

### Slash commands not appearing
- Commands auto-register ~5 seconds after bot logs in
- Check Render logs for registration confirmations
- Wait a few seconds, then type `/` in Discord again
- If still not working, restart the service in Render dashboard

## Render-specific Notes

- **Free Plan**: Service sleeps after 15 min of inactivity (wakes on request)
- **Persistent Storage**: Free plan doesn't have persistent `/tmp`, config.json is stored
- **Logs**: Available in Render dashboard under "Logs" tab
- **Custom Domain**: Upgrade to paid plan to use custom domain
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
