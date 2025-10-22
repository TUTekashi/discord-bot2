# Discord Translation Bot

## Overview
A Discord bot that provides automatic translation capabilities using DeepL API. The bot adds translation buttons to messages in designated channels and allows users to set their preferred language for translations.

## Project Type
Backend service (Discord bot) - No frontend interface

## Tech Stack
- Node.js (CommonJS)
- discord.js v14 - Discord bot framework
- deepl-node - DeepL translation API client
- dotenv - Environment variable management

## Features
- Slash commands: `/setlanguage` and `/settranslatechannel`
- Automatic translation button on messages in designated channel
- Translation caching to reduce API calls
- Per-user language preferences
- Language detection via DeepL

## Required Environment Variables
The following secrets must be configured in Replit Secrets (NOT in .env file):
- `DISCORD_TOKEN` - Discord bot token
- `DEEPL_KEY` - DeepL API key
- `CLIENT_ID` - Discord application client ID
- `GUILD_ID` - Discord guild (server) ID (optional)

## Project Structure
- `index.js` - Main bot entry point
- `commands/` - Slash command handlers
  - `setlanguage.js` - Set user's preferred language
  - `settranslatechannel.js` - Set translation channel
- `data/` - JSON data storage
  - `userLanguages.json` - User language preferences
  - `translateChannel.json` - Configured translation channel
  - `cache.json` - Translation cache
- `clear-and-deploy.js` - Deploy/clear slash commands
- `delete-commands-by-id.js` - Remove specific commands
- `list-commands.js` - List registered commands

## Setup Notes
- Dependencies are already installed
- Data files are auto-created on first run
- Translation cache auto-cleans every 6 hours
- Bot requires MESSAGE_CONTENT intent to read messages

## Setup Instructions
1. Ensure all required secrets are set in Replit Secrets
2. Run `node clear-and-deploy.js` to deploy slash commands to Discord (one-time setup)
3. Bot will automatically start via the workflow

## Recent Changes
- 2025-10-22: Initial setup in Replit environment
  - Created .gitignore to exclude .env and data files
  - Configured workflow to run bot as background service
  - Moved secrets from .env to Replit Secrets system
  - Fixed deprecation warning (ready → clientReady event)
  - Deployed slash commands to Discord server
