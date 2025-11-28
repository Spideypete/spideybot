# SPIDEY BOT

## Overview

SPIDEY BOT is a feature-rich Discord bot with an integrated web dashboard for server management. The bot provides moderation tools, music playback, leveling systems, reaction roles, member event tracking, and comprehensive server administration capabilities. The project combines a Discord.js-based bot with an Express.js web server that serves both static pages and a dynamic admin dashboard.

## User Preferences

- Preferred communication style: Simple, everyday language.
- **CRITICAL: All changes deploy directly to Render production. Every change must be tested and working before deployment.**
- **CRITICAL: When changing languages or installing new packages, verify bot + website still work before pushing to GitHub.**
- **CRITICAL: When changing the bot prefix, verify commands work with the new prefix before deploying.**
- **Deployment Workflow**: Keep updating `/dist/` folder with each change. User will push to GitHub/Render in batches when ready with more work.

## Deployment Status

✅ **LIVE ON RENDER** - Single Node.js service running both Discord bot and website
- Website files served from `/dist/` via Express
- Bot runs in background on same process
- All changes are immediately deployed to production
- Build: `npm install` → Start: `node index.cjs`

## System Architecture

### Frontend Architecture

**Multi-Page Web Application**: The frontend consists of static HTML pages with embedded CSS and minimal JavaScript, following a traditional server-rendered approach rather than a SPA framework.

**Design System**: Implements a cyberpunk/Spider-Verse aesthetic with:
- Gradient backgrounds (purple, cyan, pink color scheme)
- Grid overlays and radial gradients
- Glassmorphism effects (backdrop-filter blur)
- Custom animations and transitions
- Responsive layouts using flexbox

**Key Pages**:
- **Landing Page** (`index.html`): Marketing site with feature showcases
- **Dashboard** (`dashboard.html`): Admin interface for server configuration
- **Commands Page** (`commands.html`): Bot command reference
- **Login Page** (`login.html`): Discord OAuth authentication entry point
- **Legal Pages**: Privacy policy, terms of service, security information
- **Tutorial System**: Step-by-step guides for features (reaction roles, moderation, dashboard)

**Theme System**: Dashboard supports light/dark mode toggling with CSS variable-based theming.

### Backend Architecture

**Core Framework**: Express.js (v5.1.0) web server running on Node.js

**Bot Framework**: Discord.js (v14.25.0) for Discord API integration

**Music System**: Discord-player (v7.1.0) with multiple extractors for audio playback from various sources (YouTube, Spotify, SoundCloud, etc.)

**Session Management**: Express-session for maintaining user authentication state

**Configuration Storage**: JSON file-based configuration (`config.json`) storing:
- Guild-specific settings (welcome messages, mod log channels)
- Role categories and reaction role mappings
- Message counting and leveling data
- Member event history (joins, boosts)
- Subscription information
- Bot preferences (prefix, nickname, timezone)

**Security Module** (`security.js`): Custom implementation providing:
- Rate limiting with configurable windows and request thresholds
- Input validation and sanitization (HTML/script injection prevention)
- Middleware integration for Express routes

**Rationale**: File-based JSON storage was chosen for simplicity and portability, though this limits scalability for multi-instance deployments. The modular security system provides protection beyond basic Discord bot security.

### Data Storage

**Primary Storage**: JSON configuration file (`config.json`)

**Data Structure**: Hierarchical organization by guild ID with nested objects for different feature sets

**Persistence Strategy**: In-memory modifications with periodic writes to disk (implied by the architecture)

**Limitations**: 
- No transaction support
- No concurrent access handling
- Limited query capabilities
- Potential data loss on crashes if not properly saved

**Future Consideration**: The architecture could migrate to a database (PostgreSQL with Drizzle ORM) for improved reliability, querying, and multi-instance support.

### Authentication & Authorization

**Discord OAuth2**: Uses Discord's OAuth2 flow for user authentication (referenced in `login.html`)

**Session-Based Auth**: Express-session maintains authenticated state after Discord login

**Permission System**: Dashboard likely verifies Discord server permissions (Administrator/Manage Server) before allowing configuration changes

**Security Measures**:
- Rate limiting on authentication endpoints
- Input sanitization for all user-provided data
- HTTPS enforcement (implied by production deployment)

## External Dependencies

### Discord Integration

- **discord.js** (v14.25.0): Main Discord API client library
- **Discord Developer Portal**: Bot token and OAuth2 client credentials required
- **Discord Gateway**: WebSocket connection for real-time events

### Music Playback Services

- **discord-player** (v7.1.0): Audio playback framework
- **@discord-player/extractor** (v7.1.0): Multi-source audio extraction
- **youtube-sr** (v4.3.12): YouTube search functionality
- **Supported Platforms**: YouTube, Spotify, SoundCloud, Reverbnation (via extractors)

### Web Server Dependencies

- **express** (v5.1.0): HTTP server framework
- **express-session** (v1.18.2): Session middleware
- **axios** (v1.13.2): HTTP client for external API requests

### Environment Variables

Required secrets (managed via `.env` file with dotenv):
- Discord bot token
- Discord OAuth2 client ID and secret
- Session secret key
- API keys for music sources (if required)

### Third-Party APIs

- **Discord API**: All bot functionality and OAuth authentication
- **YouTube API**: Video search and metadata (via youtube-sr)
- **Spotify API**: Track information extraction (via spotify-url-info)
- **Audio Streaming**: Direct stream URLs from various platforms

### Development Tools

- **Node.js Runtime**: JavaScript execution environment
- **npm**: Package management
- **dotenv**: Environment variable loading

## Deployment

### Render Deployment (Recommended)

**Architecture**: Separate services for bot and website

**Service 1: Discord Bot (Node Web Service)**
- Build command: `npm install`
- Start command: `node index.cjs`
- Port: Render auto-assigns (typically 10000)
- Environment variables: CLIENT_ID, DISCORD_CLIENT_SECRET, TOKEN, OPENAI_API_KEY, SESSION_SECRET

**Service 2: Website (Static Site)**
- Build command: `npm run build`
- Publish directory: `dist/`
- This serves your landing page, dashboard, commands page, and other static content

**Why Two Services?**
- The Node service runs the Discord bot backend and API endpoints
- The Static Site service serves your website (HTML/CSS/JS) with proper caching and no stale builds
- This prevents the caching issue where old website code gets stuck on Render

**Setup Steps:**
1. Delete current Render service (if using Render)
2. Create new Web Service for the bot with settings above
3. Create new Static Site service with settings above
4. Both pull from the same GitHub repository
5. Deploy both services

### Build Process

The `npm run build` script copies all website files from `/public` to `/dist/`. This output is served by Render's Static Site service, ensuring fresh content on every build with no caching issues.

### Local Testing

- Run `npm run build` to test the website build
- Files appear in `/dist/` directory
- Same output will be served by Render's Static Site service