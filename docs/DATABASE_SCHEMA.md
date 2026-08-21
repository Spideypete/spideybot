# Spidey Bot Database Architecture
## Supabase / PostgreSQL Schema Design

### Overview
This document defines the database schema for Spidey Bot's online persistence layer.
The architecture separates the UI, API layer, and database to ensure security and maintainability.

### Architecture Flow
```
Dashboard (Browser)
    ↓ HTTPS/REST
Spidey Bot / Node API (index.cjs + feature routes)
    ↓ PostgreSQL Client
Supabase PostgreSQL
```

### Critical Security Rule
**NEVER expose Supabase service_role key or database credentials to the browser.**
All database operations must flow through the Node.js API layer.

---

## Environment Variables Required

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...  # For browser-side queries if needed
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, NEVER expose to client
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (if direct connection needed)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

---

## Schema Tables

### 1. users
Discord user records for dashboard authentication.
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,          -- Discord user ID
  username TEXT NOT NULL,
  discriminator TEXT,
  avatar TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',       -- 'user' | 'admin' | 'owner'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

### 2. servers
Guild/server configuration master table.
```sql
CREATE TABLE servers (
  id BIGINT PRIMARY KEY,          -- Discord guild ID
  name TEXT NOT NULL,
  icon TEXT,
  owner_id BIGINT REFERENCES users(id),
  prefix TEXT DEFAULT '/',
  language TEXT DEFAULT 'en',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. server_members
Tracks member counts and roles per server.
```sql
CREATE TABLE server_members (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  username TEXT NOT NULL,
  roles JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(server_id, user_id)
);
CREATE INDEX idx_server_members_server ON server_members(server_id);
```

### 4. server_settings
Centralized per-server feature toggles.
```sql
CREATE TABLE server_settings (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  welcome_enabled BOOLEAN DEFAULT FALSE,
  welcome_channel_id BIGINT,
  welcome_message TEXT,
  goodbye_enabled BOOLEAN DEFAULT FALSE,
  goodbye_channel_id BIGINT,
  goodbye_message TEXT,
  boost_enabled BOOLEAN DEFAULT FALSE,
  auto_role_enabled BOOLEAN DEFAULT FALSE,
  auto_role_id BIGINT,
  auto_mod_enabled BOOLEAN DEFAULT TRUE,
  logging_enabled BOOLEAN DEFAULT FALSE,
  log_channel_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id)
);
```

### 5. logging_settings
```sql
CREATE TABLE logging_settings (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  message_log_channel_id BIGINT,
  member_log_channel_id BIGINT,
  mod_log_channel_id BIGINT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id)
);
```

### 6. server_guard_settings
```sql
CREATE TABLE server_guard_settings (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  raids_enabled BOOLEAN DEFAULT TRUE,
  links_enabled BOOLEAN DEFAULT FALSE,
  new_accounts_enabled BOOLEAN DEFAULT FALSE,
  anti_nuke_enabled BOOLEAN DEFAULT TRUE,
  join_gate_enabled BOOLEAN DEFAULT TRUE,
  whitelist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id)
);
```

### 7. reaction_roles
```sql
CREATE TABLE reaction_roles (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  message_id BIGINT NOT NULL,
  emoji TEXT NOT NULL,
  role_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reaction_roles_server ON reaction_roles(server_id);
```

### 8. role_categories
```sql
CREATE TABLE role_categories (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_role_categories_server ON role_categories(server_id);
```

### 9. server_messages
Welcome, goodbye, and boost messages.
```sql
CREATE TABLE server_messages (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  welcome_channel_id BIGINT,
  welcome_message TEXT,
  goodbye_channel_id BIGINT,
  goodbye_message TEXT,
  boost_channel_id BIGINT,
  boost_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id)
);
```

### 10. custom_commands
```sql
CREATE TABLE custom_commands (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);
```

### 11. levels_settings
```sql
CREATE TABLE levels_settings (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  xp_per_message INTEGER DEFAULT 15,
  xp_per_level INTEGER DEFAULT 500,
  announce_level_ups BOOLEAN DEFAULT TRUE,
  announcement_channel_id BIGINT,
  level_roles JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id)
);
```

### 12. level_users
```sql
CREATE TABLE level_users (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_xp_gain TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);
CREATE INDEX idx_level_users_server ON level_users(server_id);
CREATE INDEX idx_level_users_xp ON level_users(server_id, xp DESC);
```

### 13. giveaways
```sql
CREATE TABLE giveaways (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  prize TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  ended BOOLEAN DEFAULT FALSE,
  winners JSONB DEFAULT '[]',
  entrants JSONB DEFAULT '[]',
  channel_id BIGINT,
  message_id BIGINT,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_giveaways_server ON giveaways(server_id);
```

### 14. tickets
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  user_id BIGINT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'open',     -- 'open' | 'pending' | 'resolved' | 'closed'
  claimed_by BIGINT,
  channel_id BIGINT,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, ticket_number)
);
CREATE INDEX idx_tickets_server ON tickets(server_id);
```

### 15. social_notifications
```sql
CREATE TABLE social_notifications (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,         -- 'youtube' | 'twitch' | 'tiktok' | 'kick'
  username TEXT NOT NULL,
  channel_id BIGINT,
  enabled BOOLEAN DEFAULT TRUE,
  last_status TEXT,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_notifications_server ON social_notifications(server_id);
```

### 16. invites
```sql
CREATE TABLE invites (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  inviter_id BIGINT,
  uses INTEGER DEFAULT 0,
  joins INTEGER DEFAULT 0,
  leaves INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, invite_code)
);
CREATE INDEX idx_invites_server ON invites(server_id);
```

### 17. events
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  user_id BIGINT,
  username TEXT,
  action TEXT NOT NULL,           -- 'join' | 'leave' | 'ban' | 'role_update' | etc.
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_server ON events(server_id, created_at DESC);
```

---

## Migration Strategy

### Phase 1: Schema Setup
1. Create all tables in Supabase SQL editor
2. Enable Row Level Security (RLS) on all tables
3. Create indexes for common queries

### Phase 2: Data Migration
1. Migrate existing config.json data to PostgreSQL
2. Backfill server_members from guild cache
3. Preserve existing feature configurations

### Phase 3: API Layer Updates
1. Add database client to feature services
2. Replace in-memory config with database queries
3. Add caching layer for frequently accessed data
4. Keep test dashboard working with localStorage fallback

### Phase 4: Validation
1. Verify all CRUD operations
2. Load testing
3. Backup/restore procedures

---

## API Layer Design

### Current Architecture (to be preserved)
```
src/features/*/service.cjs  →  Business logic
src/features/*/handler.cjs  →  Discord event handlers
src/features/*/routes.cjs   →  Express API routes
index.cjs                   →  Route mounting + bot initialization
```

### Future Database Layer
```
src/features/*/service.cjs  →  Business logic
src/db/client.cjs           →  Supabase/PostgreSQL client
src/db/repositories/*.cjs   →  Data access layer
src/features/*/routes.cjs   →  Express API routes
index.cjs                   →  Route mounting + bot initialization
```

### Test Data Provider Pattern
```javascript
// test-data-provider.cjs (for test dashboard)
const TestDataProvider = {
  getServers() { /* localStorage */ },
  getConfig(serverId) { /* localStorage */ },
  saveConfig(serverId, config) { /* localStorage */ }
};

// db-provider.cjs (for production)
const DbProvider = {
  getServers() { /* supabase query */ },
  getConfig(serverId) { /* supabase query */ },
  saveConfig(serverId, config) { /* supabase mutation */ }
};
```

The test dashboard UI should call the same interface regardless of data source.

---

## Security Considerations

1. **Service Role Key**: Never send to browser. Only use in Node.js API routes.
2. **Anon Key**: Can be used in browser if RLS policies are properly configured.
3. **Row Level Security**: Enable RLS on all tables. Policies should restrict access to server-specific data.
4. **Input Validation**: Validate all inputs in API routes before database queries.
5. **Rate Limiting**: Apply rate limiting to all API endpoints.
6. **CORS**: Configure CORS to only allow dashboard origin in production.

---

## Backup Strategy

1. Supabase automatic backups (daily)
2. Export config.json as fallback
3. Test data preserved in localStorage per-browser
