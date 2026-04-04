#!/bin/bash
# Bot auto-restart script

cd /root/spideybot

# Pull latest code
git pull origin master

# Kill existing bot
pkill -f "node index.cjs" || true

# Start bot in background
nohup node index.cjs > bot.log 2>&1 &

echo "Bot restarted at $(date)"