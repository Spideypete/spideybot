# SPIDEY BOT — Discord

This folder is reserved for the existing Discord bot and its dashboard as part of the planned repository layout.

**Production protection:** the live Discord bot currently uses the repository's existing root-level application files and its existing Railway deployment. Those files and deployment are intentionally left in place during this initial Root App setup.

A later, dedicated migration can move the Discord application into this folder only after:
- all source files and deployment scripts are mapped;
- Railway's Discord service root directory and build/start commands are updated safely;
- the production deployment is verified healthy.

Do not duplicate or delete the root-level Discord application as part of Root App work.
