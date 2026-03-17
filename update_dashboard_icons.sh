#!/bin/bash

# Update all panel titles with Phosphor icons
sed -i 's|<div class="panel-title">📝 Message Logging</div>|<div class="panel-title"><i class="ph-bold ph-clipboard-text"></i> Message Logging</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">👤 Moderation Logging</div>|<div class="panel-title"><i class="ph-bold ph-clipboard-text"></i> Moderation Logging</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📝 Audit Logging</div>|<div class="panel-title"><i class="ph-bold ph-shield-check"></i> Audit Logging</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">⚙️ Settings</div>|<div class="panel-title"><i class="ph-bold ph-gear"></i> Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📋 Active Reaction Roles</div>|<div class="panel-title"><i class="ph-bold ph-check-square-offset"></i> Active Reaction Roles</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📨 Quick Post Role Selector</div>|<div class="panel-title"><i class="ph-bold ph-check-square-offset"></i> Quick Post Role Selector</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📜 Role Categories</div>|<div class="panel-title"><i class="ph-bold ph-list"></i> Role Categories</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📂 Create Category</div>|<div class="panel-title"><i class="ph-bold ph-list"></i> Create Category</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📤 Post Category Selector</div>|<div class="panel-title"><i class="ph-bold ph-list"></i> Post Category Selector</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📖 How Roles Work</div>|<div class="panel-title"><i class="ph-bold ph-check-square-offset"></i> How Roles Work</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🗑️ Remove Roles</div>|<div class="panel-title"><i class="ph-bold ph-check-square-offset"></i> Remove Roles</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎖️ Auto Level Roles</div>|<div class="panel-title"><i class="ph-bold ph-lightning"></i> Auto Level Roles</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🔍 Filter Logs</div>|<div class="panel-title"><i class="ph-bold ph-clipboard-text"></i> Filter Logs</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📋 Recent Activities</div>|<div class="panel-title"><i class="ph-bold ph-pulse"></i> Recent Activities</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📊 Log Statistics</div>|<div class="panel-title"><i class="ph-bold ph-chart-bar"></i> Log Statistics</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📨 Welcome Message</div>|<div class="panel-title"><i class="ph-bold ph-chat-centered-text"></i> Welcome Message</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">👋 Goodbye Message</div>|<div class="panel-title"><i class="ph-bold ph-chat-centered-text"></i> Goodbye Message</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">⚡ Create Command</div>|<div class="panel-title"><i class="ph-bold ph-terminal"></i> Create Command</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📝 Aliases</div>|<div class="panel-title"><i class="ph-bold ph-terminal"></i> Aliases</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🧩 Available Components</div>|<div class="panel-title"><i class="ph-bold ph-diamonds-four"></i> Available Components</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">⭐ XP Settings</div>|<div class="panel-title"><i class="ph-bold ph-lightning"></i> XP Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎯 Level Roles</div>|<div class="panel-title"><i class="ph-bold ph-lightning"></i> Level Roles</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎯 Leveling Settings</div>|<div class="panel-title"><i class="ph-bold ph-lightning"></i> Leveling Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🏆 Leaderboard Settings</div>|<div class="panel-title"><i class="ph-bold ph-ranking"></i> Leaderboard Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎁 Start New Giveaway</div>|<div class="panel-title"><i class="ph-bold ph-gift"></i> Start New Giveaway</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📊 Active Giveaways</div>|<div class="panel-title"><i class="ph-bold ph-gift"></i> Active Giveaways</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📡 Add Streamer</div>|<div class="panel-title"><i class="ph-bold ph-notification"></i> Add Streamer</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📋 Monitored Accounts</div>|<div class="panel-title"><i class="ph-bold ph-notification"></i> Monitored Accounts</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🔗 Settings</div>|<div class="panel-title"><i class="ph-bold ph-info"></i> Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📊 Invite Leaderboard</div>|<div class="panel-title"><i class="ph-bold ph-info"></i> Invite Leaderboard</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">💭 Settings</div>|<div class="panel-title"><i class="ph-bold ph-chat-centered"></i> Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📈 Message Stats</div>|<div class="panel-title"><i class="ph-bold ph-chat-centered"></i> Message Stats</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎚️ Recording Settings</div>|<div class="panel-title"><i class="ph-bold ph-record"></i> Recording Settings</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📁 Recording Library</div>|<div class="panel-title"><i class="ph-bold ph-record"></i> Recording Library</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">⏱️ Create Reminder</div>|<div class="panel-title"><i class="ph-bold ph-note"></i> Create Reminder</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📅 Scheduled Reminders</div>|<div class="panel-title"><i class="ph-bold ph-note"></i> Scheduled Reminders</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📈 Channel Statistics</div>|<div class="panel-title"><i class="ph-bold ph-chart-bar"></i> Channel Statistics</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">📊 Active Stats</div>|<div class="panel-title"><i class="ph-bold ph-chart-bar"></i> Active Stats</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">💳 Current Plan</div>|<div class="panel-title"><i class="ph-bold ph-wallet"></i> Current Plan</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎯 Features Included</div>|<div class="panel-title"><i class="ph-bold ph-wallet"></i> Features Included</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🎨 Theme Colors</div>|<div class="panel-title"><i class="ph-bold ph-paint-brush-broad"></i> Theme Colors</div>|g' public/dashboard.html
sed -i 's|<div class="panel-title">🌈 Accent Colors</div>|<div class="panel-title"><i class="ph-bold ph-paint-brush-broad"></i> Accent Colors</div>|g' public/dashboard.html

echo "✅ All panel icons updated with Phosphor icons"
