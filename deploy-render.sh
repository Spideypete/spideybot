#!/bin/bash
# SPIDEY BOT - Automated Render Deployment via API
# Requires: RENDER_API_KEY or RENDER_DEPLOY_HOOK

set -e

RENDER_APP_URL="https://spideybot-90sr.onrender.com"
RENDER_API_KEY="${RENDER_API_KEY:-}"
RENDER_DEPLOY_HOOK="${RENDER_DEPLOY_HOOK:-}"
RENDER_SERVICE_ID="${RENDER_SERVICE_ID:-}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       SPIDEY BOT - Automated Render Deployment            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Method 1: Deploy Hook (Easiest)
if [ -n "$RENDER_DEPLOY_HOOK" ]; then
    echo "🚀 Method: Deploy Hook"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Triggering deployment..."
    
    RESPONSE=$(curl -s -X POST "$RENDER_DEPLOY_HOOK" -w "\nHTTP_CODE:%{http_code}")
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "✅ Deployment triggered successfully!"
        echo "📋 Deployment started on Render"
    else
        echo "⚠️  Deploy hook returned HTTP $HTTP_CODE"
        echo "$RESPONSE"
    fi

# Method 2: Render API (More control)
elif [ -n "$RENDER_API_KEY" ] && [ -n "$RENDER_SERVICE_ID" ]; then
    echo "🚀 Method: Render API"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Triggering deployment via API..."
    
    RESPONSE=$(curl -s -X POST \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"clearCache": false}')
    
    DEPLOY_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$DEPLOY_ID" ]; then
        echo "✅ Deployment created!"
        echo "📋 Deploy ID: $DEPLOY_ID"
        echo "🔗 Monitor: https://dashboard.render.com"
    else
        echo "⚠️  API response:"
        echo "$RESPONSE"
    fi

# Method 3: Get credentials first
else
    echo "❌ No credentials found!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 SETUP INSTRUCTIONS:"
    echo ""
    echo "OPTION 1 - Deploy Hook (Recommended - Easiest):"
    echo "   1. Go to: https://dashboard.render.com"
    echo "   2. Select: spideybot-90sr"
    echo "   3. Settings → Deploy Hook"
    echo "   4. Copy the URL"
    echo "   5. Run:"
    echo ""
    echo "      export RENDER_DEPLOY_HOOK='<paste-hook-url-here>'"
    echo "      bash deploy-render.sh"
    echo ""
    echo "OPTION 2 - API Key (More control):"
    echo "   1. Go to: https://dashboard.render.com/u/settings"
    echo "   2. Click 'API Keys'"
    echo "   3. Create new API key"
    echo "   4. Copy the key (starts with 'rnd_')"
    echo "   5. Get Service ID from service URL"
    echo "   6. Run:"
    echo ""
    echo "      export RENDER_API_KEY='rnd_...'"
    echo "      export RENDER_SERVICE_ID='srv-...'"
    echo "      bash deploy-render.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

# Wait a moment and check status
echo ""
echo "⏳ Waiting 10 seconds for deployment to start..."
sleep 10

echo ""
echo "🔍 Checking service status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RENDER_APP_URL" || echo "000")
echo "Web server: HTTP $HTTP_CODE $([ "$HTTP_CODE" = "200" ] && echo "✅" || echo "⏳ (deploying...)")"

LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RENDER_APP_URL/login" || echo "000")
echo "Login endpoint: HTTP $LOGIN_CODE $([ "$LOGIN_CODE" = "302" ] && echo "✅" || [ "$LOGIN_CODE" = "200" ] && echo "✅" || echo "⏳")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Info:"
echo "   • App URL: $RENDER_APP_URL"
echo "   • Login: $RENDER_APP_URL/login"
echo "   • Dashboard: $RENDER_APP_URL/dashboard"
echo "   • Render Logs: https://dashboard.render.com"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
    echo "💡 Note: Deployment takes 2-5 minutes"
    echo "   Check https://dashboard.render.com for live deployment logs"
fi

echo ""
echo "✅ Deployment triggered! Monitor progress in Render dashboard."
