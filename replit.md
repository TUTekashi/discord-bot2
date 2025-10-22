# Discord Translation Bot

## Overview
A production-ready Discord bot that provides automatic translation capabilities using DeepL API. The bot offers both on-demand button translations and automatic translation mode with intelligent language detection and comprehensive error handling.

## Project Type
Backend service (Discord bot) - No frontend interface

## Tech Stack
- Node.js (CommonJS)
- discord.js v14 - Discord bot framework
- deepl-node - DeepL translation API client
- dotenv - Environment variable management

## Features
### Core Translation
- **25 supported languages**: Arabic, Bulgarian, Chinese, Czech, Dutch, English, Finnish, French, German, Greek, Hungarian, Italian, Japanese, Korean, Latvian, Lithuanian, Polish, Portuguese, Russian, Slovak, Slovenian, Spanish, Swedish, Turkish, Ukrainian
- **Dual translation modes**:
  - **Button Mode** (default): Click "🌍 Translate" button to get translations
  - **Auto Mode**: Automatically receive translations via DM for all messages
- **Smart language detection**: Only shows translate button when users need it
- **Translation caching**: Reduces API calls and improves performance

### Administration
- **Multi-channel support**: Set multiple channels for translation buttons
- **Admin-only controls**: Only administrators can manage translation channels
- **Channel management**: Add or remove translation channels easily

### Performance & Reliability
- **Memory optimization**: Automatic cleanup of button tracking and cache
- **Button auto-cleanup**: Translate buttons auto-delete after 10 minutes
- **Comprehensive error handling**: Specific messages for quota limits, timeouts, and API errors
- **Channel data caching**: Optimized file I/O for better performance

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

## Commands
- `/setlanguage [language] [mode]` - Set your preferred language and translation mode
  - Choose from 25 supported languages
  - Select "button" mode (click to translate) or "auto" mode (automatic DM translations)
- `/settranslatechannel [channel] [action]` - Manage translation channels (Admin only)
  - Add or remove channels where translation buttons appear
  - Supports multiple channels simultaneously

## Setup Instructions
1. Ensure all required secrets are set in Replit Secrets
2. Run `node clear-and-deploy.js` to deploy slash commands to Discord (one-time setup)
3. Bot will automatically start via the workflow
4. Use `/settranslatechannel` to designate channels for translations
5. Users can set their language preference with `/setlanguage`

## User Guide
1. **Set your language**: `/setlanguage language:Spanish mode:button`
2. **Choose mode**:
   - **Button mode**: Click translate button when you need it
   - **Auto mode**: Receive automatic DM translations for all messages
3. **Translate messages**: Click the "🌍 Translate" button on any message in designated channels

## Recent Changes
- 2025-10-22: Major improvements and production-ready release
  - ✅ Added admin permission check for channel management
  - ✅ Added language validation with 25 DeepL-supported languages
  - ✅ Fixed memory leaks (button tracking with TTL cleanup)
  - ✅ Optimized channel data caching
  - ✅ Improved error handling with specific DeepL API messages
  - ✅ Added multi-channel translation support
  - ✅ Implemented auto-translate mode with DM delivery
  - ✅ Added button auto-cleanup (10-minute TTL)
  - ✅ Fixed language matching (EN vs EN-US now correctly matches)
  - ✅ Show detected language in translation responses
- 2025-10-22: Initial setup in Replit environment
  - Created .gitignore to exclude .env and data files
  - Configured workflow to run bot as background service
  - Fixed deprecation warning (ready → clientReady event)
  - Deployed slash commands to Discord server
