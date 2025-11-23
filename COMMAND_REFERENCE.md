# SPIDEY BOT - Complete Command Reference

## Quick Start
Type `//command` in your Discord server. Bot prefix is `//` (configurable via `//set-prefix`).

---

## 🎵 MUSIC COMMANDS

| Command | Usage | Description |
|---------|-------|-------------|
| `//play` | `//play [song name or YouTube URL]` | Search and play from YouTube |
| `//queue` | `//queue` | Show next 10 songs in queue |
| `//loop` | `//loop` | Toggle queue repeat mode |
| `//shuffle` | `//shuffle` | Randomize the queue order |
| `//volume` | `//volume [0-200]` | Adjust playback volume (0=mute, 200=double) |
| `⏮ ⏸ ▶ ⏭ ⏹` | Click buttons | Control buttons during playback |

---

## 🎮 GAMES & FUN

| Command | Usage | Description |
|---------|-------|-------------|
| `//8ball` | `//8ball` | Ask the magic 8ball a yes/no question |
| `//dice` | `//dice` | Roll a dice (1-6) |
| `//coin` | `//coin` | Flip a coin (heads/tails) |
| `//trivia` | `//trivia` | Get a random trivia question |
| `//rps` | `//rps [rock/paper/scissors]` | Play rock-paper-scissors against the bot |

---

## 💰 ECONOMY SYSTEM

| Command | Usage | Description |
|---------|-------|-------------|
| `//balance` | `//balance` | Check your coin balance |
| `//daily` | `//daily` | Claim 100 coins daily (24h cooldown) |
| `//work` | `//work` | Work for coins (5 minute cooldown) |
| `//transfer` | `//transfer @user [amount]` | Send coins to other members |
| `//leaderboard` | `//leaderboard` | View top 10 richest members |

---

## 📈 LEVELING & XP SYSTEM

| Command | Usage | Description |
|---------|-------|-------------|
| `//level` | `//level` | Check your current level and XP |
| `//xpleaderboard` | `//xpleaderboard` | View top members by level |
| **Auto XP** | Chat in voice/text | Passive: Gain 10-30 XP per minute |
| **Level Roles** | Reach milestones | Auto-assigned role badges (1-100) |

**XP System Details:**
- Gain 10-30 XP per minute of chatting
- Level up every 500 XP
- Auto-assigned level roles with emoji badges
- Higher levels unlock special perks

---

## ⚠️ MODERATION COMMANDS (Admin Only)

| Command | Usage | Description |
|---------|-------|-------------|
| `//kick` | `//kick @user [reason]` | Remove member from server |
| `//ban` | `//ban @user [reason]` | Permanently ban member |
| `//warn` | `//warn @user [reason]` | Warn member (tracked & logged) |
| `//mute` | `//mute @user` | Timeout for 1 hour |
| `//unmute` | `//unmute @user` | Remove timeout |
| `//warnings` | `//warnings @user` | View member's warning history |

**Moderation Features:**
- All actions logged to mod-log channel
- Auto-tracking of violations
- Reason documentation
- 24/7 audit trail

---

## 🎭 ROLE MANAGEMENT (Admin Only)

| Command | Usage | Description |
|---------|-------|-------------|
| `//setup-roles` | `//setup-roles` | Post gaming roles selector with buttons |
| `//setup-watchparty` | `//setup-watchparty` | Post watch party role selector |
| `//setup-platform` | `//setup-platform` | Post platform roles selector (PC/PS5/Xbox) |
| `//remove-roles` | `//remove-roles` | Post role removal message for members |
| `//setup-level-roles` | `//setup-level-roles` | Create 100 auto-level roles (1-100) |

**Features:**
- One-click role assignment
- Custom role categories
- Automatic level-based roles
- Visual role selectors with buttons

---

## 📢 SOCIAL MEDIA MONITORING (Admin Only)

### Twitch Monitoring
| Command | Usage |
|---------|-------|
| `//add-twitch-user` | `//add-twitch-user [username]` |
| `//remove-twitch-user` | `//remove-twitch-user [username]` |
| `//list-twitch-users` | `//list-twitch-users` |
| `//config-twitch-channel` | `//config-twitch-channel #channel` |

### TikTok Monitoring
| Command | Usage |
|---------|-------|
| `//add-tiktok-user` | `//add-tiktok-user [username]` |
| `//remove-tiktok-user` | `//remove-tiktok-user [username]` |
| `//list-tiktok-users` | `//list-tiktok-users` |
| `//config-tiktok-channel` | `//config-tiktok-channel #channel` |

### Kick Monitoring
| Command | Usage |
|---------|-------|
| `//add-kick-user` | `//add-kick-user [username]` |
| `//remove-kick-user` | `//remove-kick-user [username]` |
| `//list-kick-users` | `//list-kick-users` |
| `//config-kick-channel` | `//config-kick-channel #channel` |

**How It Works:**
- Bot monitors unlimited creators
- Auto-alerts when they go live
- Posts to designated channel
- Real-time notifications

---

## ⚙️ SERVER CONFIGURATION (Admin Only)

| Command | Usage | Description |
|---------|-------|-------------|
| `//set-prefix` | `//set-prefix [prefix]` | Change command prefix (default: //) |
| `//config-modlog` | `//config-modlog #channel` | Set moderation log channel |
| `//link-filter` | `//link-filter [on/off]` | Toggle automatic link filtering |
| `//ticket-setup` | `//ticket-setup #channel` | Enable ticket system |

---

## 🎫 TICKET SUPPORT SYSTEM

| Command | Usage | Description |
|---------|-------|-------------|
| `//ticket` | `//ticket` | Create a support ticket |
| `//close-ticket` | `//close-ticket` | Close active ticket (admin) |
| `//ticket-setup` | `//ticket-setup #channel` | Enable system (admin) |

**Features:**
- Auto-create dedicated channels
- Automatic transcripts
- Quick resolution tracking

---

## 📝 CUSTOM COMMANDS (Admin Only)

| Command | Usage | Description |
|---------|-------|-------------|
| `//addcmd` | `//addcmd [name] \| [response]` | Create custom command |
| `//delcmd` | `//delcmd [command]` | Delete custom command |
| `//[custom]` | Use your custom command | Run saved custom command |

**Example:**
```
//addcmd rules | Welcome! Here are our server rules: 1. Be respectful...
//rules → Posts rule message
```

---

## ℹ️ INFORMATION COMMANDS

| Command | Usage | Description |
|---------|-------|-------------|
| `//ping` | `//ping` | Check bot status, latency, and stats |
| `//help` | `//help` | Show full command list |
| `//adminhelp` | `//adminhelp` | Show admin commands only |
| `//developers` | `//developers` | Meet the dev team & join Discord |

---

## 💡 TIPS & TRICKS

### Role Mentions
Format roles as: `@RoleName` or just `RoleName`
```
//setup-roles
→ Members click buttons to get gaming roles
```

### Custom Command Variables
*Coming soon*
- `{user}` - Mention user
- `{username}` - User's name
- `{server}` - Server name
- `{membercount}` - Total members

### Passive Leveling
- Just chat and gain XP automatically
- No commands needed for leveling
- Auto-roles at each level

---

## 🔗 ADDITIONAL RESOURCES

- **Dashboard**: Access at `/admin` (login with Discord)
- **Activity Logs**: Track all bot activities in real-time
- **API**: RESTful API available at `/api/*`
- **Support**: Use `//ticket` for help

---

## ⚡ POWER USER SHORTCUTS

| Action | Command |
|--------|---------|
| Claim daily reward | `//daily` |
| Check level | `//level` |
| List top players | `//leaderboard` |
| Check bot ping | `//ping` |
| Create ticket | `//ticket` |

---

**Last Updated**: November 22, 2025
**Bot Version**: 2.0
**Total Commands**: 50+

