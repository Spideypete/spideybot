# SPIDEY BOT - Render Deployment Guide

## Discord OAuth Setup for Render

### 1. Get Your Render Application URL
- Deploy your app to Render first (Web Service)
- Your URL will be: `https://your-app-name.onrender.com`
- Copy this URL - you'll need it for Discord

### 2. Configure Discord OAuth for Render

**Go to Discord Developer Portal:**
1. Visit https://discord.com/developers/applications
2. Select your SPIDEY BOT application
3. Go to **OAuth2 → General**
4. Under "Redirect URLs", add **BOTH** of these:
   ```
   https://your-app-name.onrender.com/auth/discord/callback
   https://your-app-name.onrender.com/login
   ```
5. Click **Save Changes**

⚠️ **Important:** Replace `your-app-name` with your actual Render app name

### 3. Set Environment Variables on Render

In your Render Web Service dashboard, go to **Environment** and add:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_random_secret_key_here
OPENAI_API_KEY=your_openai_key_if_using_ai
```

**How to generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy to Render

**Option A: Via Git Integration**
1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Render will auto-deploy on git push

**Option B: Via Render CLI**
```bash
# Install Render CLI
npm install -g render-cli

# Deploy
render deploy
```

### 5. First Login Test

1. Visit: `https://your-app-name.onrender.com/login`
2. You'll be redirected to Discord
3. Authorize the bot
4. You should be redirected to the dashboard

### 6. Database Setup (Optional)

If using Render Postgres:
1. Create a Postgres database on Render
2. Add DATABASE_URL to environment variables
3. Update your bot code to use it

### Common Issues & Fixes

**Error: "unsupported_grant_type"**
- Make sure redirect URI in Discord matches Render URL exactly
- Check that CLIENT_ID and CLIENT_SECRET are correct

**Error: "Redirect URI mismatch"**
- The redirect URI must be registered in Discord Developer Portal
- It must match exactly (including https://)

**Bot offline on Render**
- Check logs: Dashboard → Logs
- Verify TOKEN is set correctly
- Ensure all required environment variables are set

### Monitoring

- **Logs:** View in Render dashboard → Logs
- **Bot Status:** Use `//ping` command in Discord
- **Web Server:** Visit your dashboard URL

### 24/7 Uptime

Render keeps your bot running 24/7. No additional configuration needed!

---

**Need Help?**
- Discord Developer Portal: https://discord.com/developers/applications
- Render Dashboard: https://dashboard.render.com
- Check workflow logs for detailed error messages
