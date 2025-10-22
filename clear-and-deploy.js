// clear-and-deploy.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// load current commands from ./commands
const commands = [];
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));
  for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file));
    if (!cmd.data?.toJSON) {
      console.warn(`Skipping ${file} (no valid command.data.toJSON())`);
      continue;
    }
    commands.push(cmd.data.toJSON());
  }
} else {
  console.warn("No commands folder found.");
}

(async () => {
  try {
    console.log("⚡ Clearing all global commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("✅ Global commands cleared.");

    // Optionally clear guild commands for any GUILD_IDS provided (comma-separated)
    const raw = process.env.GUILD_IDS || process.env.GUILD_ID;
    if (raw) {
      const guildIds = raw.split(",").map(s => s.trim()).filter(Boolean);
      for (const gid of guildIds) {
        console.log(`⚡ Clearing guild commands for ${gid}...`);
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, gid), { body: [] });
        console.log(`✅ Cleared guild ${gid} commands.`);
      }
    }

    // Deploy current commands globally
    console.log(`⚡ Deploying ${commands.length} global commands...`);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Global commands deployed.");
    console.log("🎉 Done — duplicates should be gone after propagation (global takes ~1-2 hours).");
  } catch (err) {
    console.error("Failed to clear/deploy:", err);
  }
})();
