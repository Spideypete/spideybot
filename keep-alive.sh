#!/bin/bash
# Keep bot running and auto-restart

while true; do
    cd /root/spideybot
    
    # Check if bot is running
    if ! pgrep -f "node index.cjs" > /dev/null; then
        echo "$(date): Bot not running, starting..."
        git pull origin master
        nohup node index.cjs > bot.log 2>&1 &
    else
        echo "$(date): Bot is running"
    fi
    
    sleep 60
done