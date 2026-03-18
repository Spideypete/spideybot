#!/bin/bash
# SPIDEY BOT - Render Deployment Script

RENDER_APP_URL="https://spideybot-90sr.onrender.com"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          SPIDEY BOT - Render Deployment Tool              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ -n "$RENDER_DEPLOY_HOOK" ]; then
    echo "🚀 Triggering deployment via Deploy Hook..."
    curl -s -X POST "$RENDER_DEPLOY_HOOK"
    echo "✅ Deploy hook triggered!"
else
    echo "⚠️  RENDER_DEPLOY_HOOK not set."
    echo "   Get it from: https://dashboard.render.com → Settings → Deploy Hook"
fi

echo ""
echo "🔍 Checking deployment status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RENDER_APP_URL" || echo "000")
echo "Web server: HTTP $HTTP_CODE"

LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RENDER_APP_URL/login" || echo "000")
echo "Login endpoint: HTTP $LOGIN_CODE"

echo ""
echo "📊 URLs:"
echo "   • App: $RENDER_APP_URL"
echo "   • Login: $RENDER_APP_URL/login"
echo "   • Dashboard: https://dashboard.render.com"
