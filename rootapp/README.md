# SPIDEY BOT — Root App

This directory is the independent Root Platform application. It must not import Discord.js, the Discord bot runtime, or the Discord dashboard runtime.

## Project type

Full Root App (client + server + networking), generated and built with the official Root SDK.

## Local setup

1. Use Node.js 22 or newer.
2. Generate the official starter project in this directory with:

   ```bash
   npx @rootsdk/create-root --app "SPIDEY BOT"
   ```

   If the generator requires an empty directory, run it in a temporary sibling directory and merge its generated files into this directory without overwriting this README or .gitignore.

3. Keep the development credential in `server/.env`:

   ```env
   DEV_TOKEN=YOUR_ROTATED_DEV_TOKEN
   ```

4. Install dependencies and build using the scripts supplied by the generated Root SDK project.
5. Run the local Root DevHost and test against the Root test community.

Never commit `.env`, tokens, private keys, or generated credential files.

## Architecture

- `client/` — Root App graphical interface.
- `server/` — Root App backend and community logic.
- `networking/` — Protobuf client/server messages.
- `root-manifest.json` — Root package and launch configuration.

## Planned SPIDEY BOT modules

- Community dashboard and configuration
- Welcome and goodbye
- Moderation and moderation logs
- Verification and account-age policy
- Audit/event logs
- Auto moderation
- SIMBA AI assistant
- Free / Premium / Pro feature entitlements

Each module must be implemented only after confirming the relevant Root API, event, and permission support. Discord-only functionality must not be assumed to exist on Root.

## Hosting boundary

Root hosts published Root App clients and servers. Railway is reserved for separately justified external services (for example, shared billing or integrations); it is not the production host for the Root App runtime. The separate Railway project created for this work is isolated and currently has no connected service or deployment.

## Separation rule

The existing Discord production app remains independent. Do not move, rename, or change its files or Railway configuration as part of Root App development.
