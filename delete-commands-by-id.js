// delete-commands-by-id.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function deleteGlobal(id) {
  try {
    await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, id));
    console.log(`✅ Deleted global command id=${id}`);
  } catch (err) {
    console.error(`❌ Failed deleting global id=${id}:`, err?.message || err);
  }
}

async function deleteGuild(guildId, id) {
  try {
    await rest.delete(Routes.applicationGuildCommand(process.env.CLIENT_ID, guildId, id));
    console.log(`✅ Deleted guild (${guildId}) command id=${id}`);
  } catch (err) {
    console.error(`❌ Failed deleting guild ${guildId} id=${id}:`, err?.message || err);
  }
}

// Usage:
// node delete-commands-by-id.js --global <id1> <id2>
// node delete-commands-by-id.js --guild <GUILD_ID> <id1> <id2>
// or combine: --global id1 --guild GUILD_ID id2 id3

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { global: [], guilds: {} };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === "--global") {
      i++;
      while (i < args.length && !args[i].startsWith("--")) {
        out.global.push(args[i]);
        i++;
      }
    } else if (a === "--guild") {
      // next arg is guildId
      const gid = args[i + 1];
      if (!gid) break;
      i += 2;
      out.guilds[gid] = out.guilds[gid] || [];
      while (i < args.length && !args[i].startsWith("--")) {
        out.guilds[gid].push(args[i]);
        i++;
      }
    } else {
      i++;
    }
  }
  return out;
}

(async () => {
  const parsed = parseArgs();
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error("Please set DISCORD_TOKEN and CLIENT_ID in your .env");
    process.exit(1);
  }

  if (parsed.global.length === 0 && Object.keys(parsed.guilds).length === 0) {
    console.error("No command IDs provided. Example:");
    console.error("  node delete-commands-by-id.js --global 12345 67890");
    console.error("  node delete-commands-by-id.js --guild GUILD_ID 12345 67890");
    process.exit(1);
  }

  for (const id of parsed.global) {
    await deleteGlobal(id);
  }

  for (const [gid, ids] of Object.entries(parsed.guilds)) {
    for (const id of ids) {
      await deleteGuild(gid, id);
    }
  }

  console.log("Done.");
})();
