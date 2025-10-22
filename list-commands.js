// list-commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Fetching global commands...");
    const global = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    console.log(`Global commands (${global.length}):`);
    global.forEach(cmd => console.log(` - ${cmd.name} (id: ${cmd.id})`));

    // Optionally list guild commands if you set GUILD_IDS (comma-separated)
    const raw = process.env.GUILD_IDS || process.env.GUILD_ID;
    if (raw) {
      const guildIds = raw.split(",").map(s => s.trim()).filter(Boolean);
      for (const gid of guildIds) {
        console.log(`\nFetching guild commands for ${gid}...`);
        const guildCmds = await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, gid));
        console.log(`Guild ${gid} commands (${guildCmds.length}):`);
        guildCmds.forEach(cmd => console.log(` - ${cmd.name} (id: ${cmd.id})`));
      }
    } else {
      console.log("\nNo GUILD_IDS or GUILD_ID in .env — skipping guild listing.");
    }
  } catch (err) {
    console.error("Failed to list commands:", err);
  }
})();
