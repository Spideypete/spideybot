    # Keeping SPIDEY BOT Always Online

## Quick Start (Development)
```bash
npm start
```
or
```bash
npm run dev
```

## Production Deployment (Recommended - Always Online)

### 1. Install Dependencies
```bash
npm install
```

### 2. Install PM2 Globally (First time only)
```bash
npm install -g pm2
```

### 3. Start Bot with PM2 (Keeps it Always Online)
```bash
npm run prod
```

Or as a background daemon:
```bash
npm run prod:daemon
```

### 4. Manage the Bot

**Check status:**
```bash
pm2 status
```

**View logs:**
```bash
npm run logs
```

**Restart:**
```bash
npm run restart
```

**Stop:**
```bash
npm run stop
```

## What's Included for Keeping Bot Online

✅ **Auto-Reconnect**: If Discord disconnects, the bot automatically reconnects after 5 seconds  
✅ **Error Recovery**: Uncaught exceptions and promise rejections are logged but don't crash the bot  
✅ **Process Manager**: PM2 automatically restarts the bot if it crashes  
✅ **Memory Management**: Auto-restart if bot uses more than 500MB RAM  
✅ **Health Checks**: Continuous monitoring and logging  

## Environment Setup

Make sure your `.env` file has:
```
TOKEN=your_bot_token_here
SESSION_SECRET=your_secret_here
NODE_ENV=production
```

## Monitoring

The bot logs are stored in:
- `logs/out.log` - Standard output
- `logs/err.log` - Error logs

View live logs:
```bash
npm run logs
```

## Render/Cloud Deployment

If deploying to Render, Replit, or similar:
1. Set environment variables in the dashboard
2. Use `npm run prod` as your start command
3. PM2 will handle keeping it alive

## Troubleshooting

**Bot still goes offline?**
- Check the logs: `npm run logs`
- Verify TOKEN is valid in `.env`
- Make sure bot has required Discord intents/permissions

**High memory usage?**
- Adjust `max_memory_restart` in `pm2.config.js`
- Common cause: Memory leak in event listeners (check for duplicate listeners)

**Want to see bot is running?**
```bash
pm2 status
pm2 list
pm2 monit
```
