# SPIDEY BOT - API Reference

## Base URL
```
https://your-domain.com
http://localhost:5000 (development)
```

---

## Authentication

All API endpoints require Discord OAuth authentication.

**Get Session:**
```
GET /auth/discord
```

**Callback:**
```
GET /auth/discord/callback?code=DISCORD_CODE
```

**Check Status:**
```
GET /api/user
Headers: Cookie: session=...
```

---

## Configuration Endpoints

### Get Guild Config
```
GET /api/config/:configName?guildId=GUILD_ID
```

**Response:**
```json
{
  "prefix": "//",
  "modLogChannelId": "123456",
  "welcomeMessage": "Welcome!",
  ...
}
```

### Save Guild Config
```
POST /api/config/:configName?guildId=GUILD_ID
Content-Type: application/json
Cookie: session=...

{
  "prefix": "//",
  "welcomeMessage": "Welcome to {server}!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Config saved"
}
```

---

## Role Categories

### Get All Role Categories
```
GET /api/config/role-categories?guildId=GUILD_ID
```

**Response:**
```json
{
  "categories": [
    {
      "id": "gaming",
      "name": "Gaming Roles",
      "roles": [
        { "id": "123", "name": "PC" },
        { "id": "124", "name": "PS5" }
      ]
    }
  ]
}
```

### Save Role Category
```
POST /api/config/role-categories?guildId=GUILD_ID
Content-Type: application/json
Cookie: session=...

{
  "categoryName": "Gaming",
  "roles": ["@PC", "@PS5"],
  "message": "Select your platform"
}
```

### Post Category to Channel
```
POST /api/post-category?guildId=GUILD_ID
Content-Type: application/json
Cookie: session=...

{
  "categoryId": "gaming",
  "channelId": "123456"
}
```

---

## Server Data

### Get Server List
```
GET /api/creator/servers
Headers: Cookie: session=...
```

**Response:**
```json
{
  "servers": [
    {
      "id": "123456",
      "name": "My Server",
      "icon": "https://...",
      "memberCount": 150
    }
  ]
}
```

### Get Member Statistics
```
GET /api/member-stats/:guildId
Headers: Cookie: session=...
```

**Response:**
```json
{
  "totalMembers": 150,
  "botCount": 5,
  "activeUsers": 45,
  "roles": [
    { "id": "123", "name": "Members", "count": 100 }
  ]
}
```

### Get Member Events
```
GET /api/member-events/:guildId
Headers: Cookie: session=...
```

**Response:**
```json
{
  "events": [
    {
      "timestamp": "2025-11-22T23:00:00Z",
      "type": "join",
      "userId": "123456",
      "username": "User#1234"
    }
  ]
}
```

---

## Custom Commands

### Get Commands
```
GET /api/commands/:guildId
Headers: Cookie: session=...
```

**Response:**
```json
{
  "commands": [
    {
      "name": "rules",
      "response": "Here are our rules...",
      "requiredRole": null
    }
  ]
}
```

### Create Command
```
POST /api/commands/:guildId
Content-Type: application/json
Cookie: session=...

{
  "name": "rules",
  "response": "Here are our rules:",
  "requiredRole": null
}
```

---

## Quick Setup

### Gaming Roles
```
POST /api/quick-setup/gaming?guildId=GUILD_ID
Headers: Cookie: session=...
```

### Watch Party
```
POST /api/quick-setup/watchparty?guildId=GUILD_ID
Headers: Cookie: session=...
```

### Platform Roles
```
POST /api/quick-setup/platform?guildId=GUILD_ID
Headers: Cookie: session=...
```

### Remove Roles
```
POST /api/quick-setup/removeRoles?guildId=GUILD_ID
Headers: Cookie: session=...
```

### Level Roles (1-100)
```
POST /api/quick-setup/levelRoles?guildId=GUILD_ID
Headers: Cookie: session=...
```

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | ✅ Operation completed |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login required |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limited (100/min) |
| 500 | Server Error | Try again later |

---

## Error Response Format

```json
{
  "success": false,
  "error": "Description of error",
  "code": "ERROR_CODE"
}
```

---

## Rate Limiting

- **Limit**: 100 requests per minute
- **Header**: `X-RateLimit-Remaining`
- **Reset**: 60 seconds after limit hit

---

## Security

✅ All requests require authenticated session
✅ HTTPS enforced in production
✅ OWASP security headers applied
✅ CSRF protection enabled
✅ Input validation on all endpoints
✅ Rate limiting per IP
✅ Audit logging enabled

---

## WebSocket Events (Future)

*Activity logging & real-time updates coming soon*

```javascript
const ws = new WebSocket('wss://domain.com/ws');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // type: 'member-join', 'level-up', 'mod-action', etc.
};
```

---

## Examples

### JavaScript
```javascript
// Get member stats
const response = await fetch('/api/member-stats/123456', {
  credentials: 'include'
});
const data = await response.json();
console.log(data);
```

### cURL
```bash
curl -H "Cookie: session=..." \
  https://domain.com/api/member-stats/123456
```

### Python
```python
import requests

session = requests.Session()
response = session.get(
  'https://domain.com/api/member-stats/123456'
)
data = response.json()
print(data)
```

---

**Last Updated**: November 22, 2025
**API Version**: 1.0
**Total Endpoints**: 37

