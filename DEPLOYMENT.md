# SPIDEY BOT - Render Deployment Guide

## Prerequisites
- GitHub account with your bot repository pushed
- Render account (https://render.com)
- Discord bot credentials (CLIENT_ID, TOKEN, DISCORD_CLIENT_SECRET)
- OpenAI API key (if using AI features)

---

## Step 1: Push Code to GitHub

```bash
# Add all files
git add .

# Commit changes
git commit -m "SPIDEY BOT - Ready for production deployment"

# Push to GitHub (replace with your repo)
git push origin main
```

---

## Step 2: Create Render Account & Connect GitHub

1. Go to https://render.com
2. Click **Sign Up** → Select **GitHub**
3. Authorize Render to access your GitHub repositories
4. Select the SPIDEY BOT repository

---

## Step 3: Deploy on Render

1. **Go to Render Dashboard** → Click **New +** → Select **Web Service**
2. **Connect Repository**: Select your SPIDEY BOT repo
3. **Configure Service**:
   - **Name**: `spidey-bot`
   - **Runtime**: Node.js (should auto-detect)
   - **Build Command**: `npm install`
   - **Start Command**: `node index.cjs`
   - **Plan**: Free (or Paid for always-on)

4. **Add Environment Variables** (click **Add Environment Variable**):

   ```
   NODE_ENV = production
   CLIENT_ID = YOUR_DISCORD_BOT_CLIENT_ID
   TOKEN = YOUR_DISCORD_BOT_TOKEN
   DISCORD_CLIENT_SECRET = YOUR_DISCORD_CLIENT_SECRET
   OPENAI_API_KEY = YOUR_OPENAI_API_KEY (optional)
   SESSION_SECRET = your-random-session-secret-here
   RENDER_EXTERNAL_URL = https://your-service-name.onrender.com
   ```

5. **Click Deploy** → Wait 2-5 minutes for deployment

---

## Step 4: Get Your Live URL

After deployment completes:
- Your bot will be live at: `https://spidey-bot.onrender.com`
- Update Discord bot OAuth redirect URI to this URL
- Add this URL to allowed domains in Discord Developer Portal

---

## Step 5: Update Discord Bot Settings

1. Go to **Discord Developer Portal** → Your Application
2. **OAuth2** → **Redirects** → Add:
   ```
   https://spidey-bot.onrender.com/auth/discord/callback
   ```
3. **Bot** → Copy **TOKEN** and add to Render env vars

---

## Environment Variables Required

| Variable | Value | Required |
|----------|-------|----------|
| `CLIENT_ID` | From Discord Developer Portal | ✅ Yes |
| `TOKEN` | Bot token from Discord | ✅ Yes |
| `DISCORD_CLIENT_SECRET` | From Discord Developer Portal | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key | ❌ No (for AI features) |
| `NODE_ENV` | `production` | ✅ Yes |
| `SESSION_SECRET` | Random string (e.g., `openssl rand -hex 32`) | ✅ Yes |

---

## Features Active on Render

✅ All 50+ Discord commands
✅ Real-time activity logging
✅ Admin dashboard with server management
✅ Music playback from YouTube
✅ Economy, leveling, and role systems
✅ Moderation tools with logging
✅ Social media monitoring (Twitch/TikTok/Kick)
✅ Ticket support system
✅ Custom commands per server

---

## Monitor Your Bot on Render

1. **Go to Render Dashboard**
2. **Select your service** → **Logs** → See real-time logs
3. **Metrics** tab → Monitor CPU, RAM, requests

---

## Troubleshooting

### Bot Not Responding
- Check bot token is correct in environment variables
- Verify bot has required Discord intents enabled
- Check Render logs for errors

### Commands Not Working
- Ensure bot has server permissions (`Administrator`)
- Check activity logs in dashboard
- Verify bot is online in Discord

### High CPU/Memory
- Render free tier has limited resources
- Consider upgrading to Paid plan for better performance
- Check for memory leaks in logs

---

## Keep Bot Always Running

**Free Tier (Spins down after 15 min of inactivity):**
- Deploy runs only when requests come in
- Good for testing

**Paid Tier ($7+/month - Recommended):**
- Always running, 24/7 uptime
- Better for production bots
- Upgrade in Render dashboard

---

## Commands Reference

All 50+ commands work the same on Render as locally:

```
Music:    //play, //queue, //loop, //shuffle, //volume
Games:    //8ball, //dice, //coin, //trivia, //rps
Economy:  //balance, //daily, //work, //transfer, //leaderboard
Leveling: //level, //xpleaderboard
Mod:      //kick, //ban, //warn, //mute, //unmute
Roles:    //setup-roles, //setup-watchparty, //setup-platform
And 20+ more!
```

See `/commands` on your live URL for full list.

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Discord Docs**: https://discord.com/developers
- **Check Logs**: Render Dashboard → Logs section
- **Bot Support**: Use `//ticket` command in Discord

---

**Status**: ✅ READY FOR PRODUCTION
**Last Updated**: November 23, 2025
