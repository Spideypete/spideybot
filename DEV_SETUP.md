## Development setup & secure secret handling

Follow these steps to run the web dashboard and bot locally while keeping secrets safe.

1) Immediate security (recommended now)
  - If you posted a bot token publicly, rotate/revoke it immediately from the Discord Developer Portal. Treat tokens as compromised.

2) Local development (quick)
  - Copy the template:
    ```bash
    cp .env.template .env
    # then edit .env and fill in values
    ```
  - Start the app:
    ```bash
    npm install
    npm start
    ```

3) Secure (recommended) — GitHub Codespaces / Codespaces Secrets
  - Go to GitHub → your repo → Settings → Secrets and variables → Codespaces.
  - Add `TOKEN`, `CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `SESSION_SECRET`.
  - Reopen the Codespace; secrets will be injected as environment variables.

4) Alternative: use environment only for current shell (no file)
  ```bash
  export TOKEN="..."
  export CLIENT_ID="..."
  export DISCORD_CLIENT_SECRET="..."
  npm start
  ```

5) Cleanup
  - Delete local `.env` when finished: `rm .env`.
  - Do NOT commit `.env` to git. `.gitignore` already excludes it.

6) If you want, I can help rotate the token or create GitHub Actions that use the secrets safely.
Development setup for Codespaces / local development

1. Open repository in GitHub Codespaces or VS Code Dev Containers.
2. The container runs `npm install` automatically (see `.devcontainer/devcontainer.json`).
3. Create a `.env` file with the following variables:
   - `TOKEN` — Discord bot token
   - `CLIENT_ID` and `CLIENT_SECRET` — Discord OAuth app credentials
   - `SESSION_SECRET` — session secret for express sessions
   - `BASE_URL` — optional public base URL (defaults to http://localhost:5000)
4. Run the app:
   - `npm run dev` or `npm start`

Notes:
- Old backup files were consolidated into the `backups/` folder.
- `index.cjs` was simplified to prefer `BASE_URL` and remove Replit-specific detection.

## Security audit summary (automated checks)

- I ran `npm audit` and found some moderate vulnerabilities related to `discord.js`'s dependency on `undici`.
- Automatic fixes recommend downgrading `discord.js` to v13 which is a breaking change for this codebase.

Recommended actions:
- Rotate the bot token immediately if it was exposed.
- Monitor `discord.js` and `undici` for upstream security patches; update to a patched version when available and run full integration tests.
- Keep the bot running in a private environment (Codespaces or internal host) until dependencies are patched.

