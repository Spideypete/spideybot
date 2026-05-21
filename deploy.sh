#!/bin/bash
# Safe deploy: one bot instance only (prevents triplicate welcome messages)

set -e
cd "$(dirname "$0")"

echo "=== Spidey Bot deploy $(date) ==="

git pull origin master

echo "Stopping all existing bot processes..."
pkill -f "node index.cjs" 2>/dev/null || true
pkill -f "spideybot/index.cjs" 2>/dev/null || true
sleep 2

# Remove stale instance lock from a crashed process
rm -f .bot.instance.lock

RUNNING=$(pgrep -fc "node index.cjs" 2>/dev/null || echo 0)
if [ "$RUNNING" -gt 0 ]; then
  echo "ERROR: node index.cjs still running ($RUNNING). Aborting deploy."
  pgrep -af "node index.cjs" || true
  exit 1
fi

nohup node index.cjs > bot.log 2>&1 &
sleep 3

echo "Started PID: $(pgrep -f 'node index.cjs' || echo 'none')"
tail -20 bot.log
