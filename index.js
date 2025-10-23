require("dotenv").config();

// --- Keep alive web server for Replit ---
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  console.log("💓 Ping received to keep bot alive");
  res.send("✅ Bot is alive and running!");
});

app.listen(3000, () => {
  console.log("🌐 Keep-alive web server running on port 3000");
});

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  escapeMarkdown,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const deepl = require("deepl-node");
const { getUserPref } = require("./utils/userPrefs.js");

// --- File paths ---
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const channelDataPath = path.join(dataDir, "translateChannel.json");
const cacheFilePath = path.join(dataDir, "cache.json");

// Ensure cache file exists
if (!fs.existsSync(cacheFilePath)) {
  fs.writeFileSync(cacheFilePath, "{}");
}

// Ensure channel config exists
if (!fs.existsSync(channelDataPath)) {
  fs.writeFileSync(channelDataPath, JSON.stringify({ channelIds: [] }, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
  }
}

const deeplTranslator = new deepl.Translator(process.env.DEEPL_KEY);

function getBaseLang(lang) {
  if (!lang) return "";
  return lang.toUpperCase().split("-")[0];
}

function languagesMatch(lang1, lang2) {
  if (!lang1 || !lang2) return false;
  const base1 = getBaseLang(lang1);
  const base2 = getBaseLang(lang2);
  return base1 === base2;
}

function isAllowedChannel(channelId) {
  if (!fs.existsSync(channelDataPath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(channelDataPath, "utf8"));
    if (data.channelId) return data.channelId === channelId;
    if (data.channelIds) return data.channelIds.includes(channelId);
    return false;
  } catch {
    return false;
  }
}

function loadTranslationCache() {
  if (!fs.existsSync(cacheFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
  } catch {
    return {};
  }
}

function saveTranslationCache(cache) {
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));
}

client.on("messageCreate", async (message) => {
  if (message.author?.bot) return;
  if (!message.content) return;
  if (!isAllowedChannel(message.channel.id)) return;

  try {
    const button = new ButtonBuilder()
      .setCustomId(`translate_${message.id}`)
      .setLabel("🌍 Translate")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({
      content: "Click to translate this message to your language:",
      components: [row],
    });
  } catch (err) {
    console.error("Error adding translate button:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (
    interaction.isChatInputCommand() ||
    interaction.isMessageContextMenuCommand()
  ) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        content: "❌ Error executing command.",
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '...', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: '...', flags: MessageFlags.Ephemeral });
      }
    }
  } else if (
    interaction.isButton() &&
    interaction.customId.startsWith("translate_")
  ) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const messageId = interaction.customId.replace("translate_", "");
      const message = await interaction.channel.messages.fetch(messageId);

      if (!message || !message.content) {
        await interaction.editReply({
          content: "❌ Could not find the message to translate.",
        });
        return;
      }

      const userLang = getUserPref(interaction.user.id);
      if (!userLang) {
        await interaction.editReply({
          content: "⚠️ Please set your language first using `/setlanguage`.",
        });
        return;
      }

      const detection = await deeplTranslator.translateText(
        message.content,
        null,
        "EN-US",
      );
      const detectedLang = (detection.detectedSourceLang || "EN").toUpperCase();

      if (languagesMatch(userLang, detectedLang)) {
        await interaction.editReply({
          content: `✅ This message is already in ${detectedLang}. No translation needed.`,
        });
        return;
      }

      const cache = loadTranslationCache();
      const cacheKey = `${message.content}::${userLang}`;
      let translatedText = cache[cacheKey]?.text;

      if (!translatedText) {
        const result = await deeplTranslator.translateText(
          message.content,
          detectedLang,
          userLang,
        );
        translatedText = result.text;
        cache[cacheKey] = { text: translatedText, timestamp: Date.now() };
        saveTranslationCache(cache);
      }

      const safeOriginal = escapeMarkdown(message.content || "");
      const safeTranslated = escapeMarkdown(translatedText || "");

      await interaction.editReply({
        content:
          `🌍 **Translation** (${detectedLang} → ${userLang})\n` +
          `**From:** ${message.author.tag}\n\n` +
          `**Original:**\n${safeOriginal}\n\n` +
          `**Translation:**\n${safeTranslated}`,
        allowedMentions: { parse: [] }, // prevents @everyone, @user mentions
      });
    } catch (err) {
      console.error("Button translation error:", err);

      let errorMessage = "❌ Translation error occurred.";

      if (err.response?.status === 456) {
        errorMessage = "⚠️ DeepL quota exceeded. Please try again later.";
      } else if (err.response?.status === 429) {
        errorMessage =
          "⏳ Too many translation requests. Please wait a moment.";
      } else if (err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
        errorMessage = "🌐 Cannot reach translation service. Please try again.";
      }

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

setInterval(
  () => {
    try {
      const translationCache = JSON.parse(
        fs.readFileSync(cacheFilePath, "utf8"),
      );
      const now = Date.now();
      let modified = false;
      for (const key in translationCache) {
        if (now - translationCache[key].timestamp > 6 * 60 * 60 * 1000) {
          delete translationCache[key];
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(
          cacheFilePath,
          JSON.stringify(translationCache, null, 2),
        );
      }
    } catch (err) {
      console.error("Cache cleanup error:", err);
    }
  },
  6 * 60 * 60 * 1000,
);

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📋 Commands loaded: ${client.commands.size}`);
});

client.login(process.env.DISCORD_TOKEN);
