# 🎯 Slash Commands - Quick Verification Guide

## ✅ Deployment Status: LIVE

**Deploy ID:** dep-d64d65ngi27c73av2edg  
**Commit:** 98aacc8  
**Status:** Live and running  
**Slash Commands:** 15 commands registered  

---

## 🔧 How to See Slash Commands in Discord

### Method 1: Refresh Discord (Quickest)
1. **Close Discord completely** (not just minimize)
2. **Reopen Discord**
3. Type `/` in any channel
4. You should see the new `/add`, `/remove`, `/config`, etc.

### Method 2: Force Refresh (Windows/Linux)
Press: **Ctrl + R** (or **Cmd + R** on Mac)

### Method 3: Clear Discord Cache
1. Close Discord
2. Press **Windows + R**
3. Type: `%appdata%/discord/Cache`
4. Delete all files in Cache folder
5. Restart Discord

---

## 🧪 Test Slash Commands

Once Discord refreshes, type these in any channel:

```
/add
```
**Expected:** Dropdown showing:
- Streamer (Twitch/Kick/TikTok)
- Game Role
- Custom Command
- Platform Role
- Watch Party Role
- Money (to user)

```
/ping
```
**Expected:** Bot responds with latency

```
/help
```
**Expected:** Shows command list

```
/setup
```
**Expected:** Dropdown showing:
- Gaming Roles Selector
- Watch Party Selector
- Platform Selector
- Level Roles (1-100)
- Ticket System

---

## ❓ Still Not Showing?

### Check Bot is Online:
1. Look at server member list
2. Find "SPIDEY BOT"
3. Should have **green dot** next to name

### Check Bot Permissions:
Bot needs these permissions:
- ✅ Send Messages
- ✅ Use Application Commands
- ✅ Manage Roles
- ✅ Read Message History

### Re-invite Bot (if needed):
If slash commands still don't show, bot may need to be re-invited with proper scopes:
1. Go to: https://discord.com/developers/applications
2. Select your bot
3. OAuth2 → URL Generator
4. Select: `bot` + `applications.commands`
5. Copy invite link and re-add bot

---

## 📊 Registered Commands

These 15 commands are now active:

1. `/add` - Add streamers, roles, commands (with autocomplete dropdown)
2. `/remove` - Remove items (with autocomplete of existing items)
3. `/config` - Configure channels (dropdown menu)
4. `/setup` - Quick feature setup (dropdown menu)
5. `/play` - Play music (with search autocomplete)
6. `/kick` - Kick user (user selector)
7. `/ban` - Ban user (user selector)
8. `/warn` - Warn user (user + reason)
9. `/giveaway` - Start giveaway (prize + duration)
10. `/level` - Check user level (optional user selector)
11. `/leaderboard` - Show top users (levels/messages choice)
12. `/help` - Show commands (with autocomplete)
13. `/ping` - Check bot latency
14. `/suggest` - Submit suggestion
15. `/ticket` - Create support ticket

---

## ⏰ Discord Slash Command Updates

**Important:** Discord caches slash commands. They can take:
- **Instant to 5 minutes** - Usually
- **Up to 1 hour** - In rare cases  
- **Requires Discord restart** - Always

**If you don't see them:**
1. ✅ Restart Discord (most important!)
2. ✅ Wait 5 minutes
3. ✅ Check bot is online (green dot)
4. ✅ Make sure you're in a server where bot has permissions

---

## 🔗 Quick Links

- **Render Dashboard:** https://dashboard.render.com
- **Discord Developer Portal:** https://discord.com/developers/applications
- **Bot Service:** https://spidey-bot-fty1.onrender.com

---

**Status:** ✅ All systems operational - commands deployed!
