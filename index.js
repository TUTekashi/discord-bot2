require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const deepl = require("deepl-node");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
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

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
      reloadTranslationChannels();
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Error executing command.", flags: 64 });
    }
  }
});

const userFilePath = path.join(__dirname, "./data/userLanguages.json");
const deeplTranslator = new deepl.Translator(process.env.DEEPL_KEY);

const cacheFilePath = path.join(__dirname, "./data/cache.json");
let translationCache = {};
if (!fs.existsSync(cacheFilePath)) fs.writeFileSync(cacheFilePath, "{}");
translationCache = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));

setInterval(() => {
  const now = Date.now();
  for (const key in translationCache) {
    if (now - translationCache[key].timestamp > 6 * 60 * 60 * 1000) delete translationCache[key];
  }
  fs.writeFileSync(cacheFilePath, JSON.stringify(translationCache, null, 2));
}, 6 * 60 * 60 * 1000);

function loadUserData() {
  if (!fs.existsSync(userFilePath)) fs.writeFileSync(userFilePath, "{}");
  const text = fs.readFileSync(userFilePath, "utf8").trim();
  return text ? JSON.parse(text) : {};
}

function getUserPref(userId) {
  const users = loadUserData();
  const raw = users[userId];
  if (!raw) return null;
  if (typeof raw === "string") {
    return { lang: normalizeLang(raw), mode: "button" };
  }
  return { 
    lang: normalizeLang(raw.lang || ""), 
    mode: raw.mode || "button" 
  };
}

function normalizeLang(lang) {
  if (!lang) return "";
  let l = lang.toUpperCase();
  if (l === "EN") l = "EN-US";
  if (l === "PT") l = "PT-PT";
  if (l === "ZH") l = "ZH-HANS";
  return l;
}

function getBaseLang(lang) {
  if (!lang) return "";
  const base = lang.toUpperCase().split("-")[0];
  return base;
}

function languagesMatch(lang1, lang2) {
  if (!lang1 || !lang2) return false;
  const base1 = getBaseLang(lang1);
  const base2 = getBaseLang(lang2);
  return base1 === base2;
}

const channelDataPath = path.join(__dirname, "./data/translateChannel.json");
if (!fs.existsSync(channelDataPath)) {
  fs.writeFileSync(channelDataPath, '{"channelIds":[]}');
}

let allowedChannelIds = [];
function reloadTranslationChannels() {
  try {
    const data = JSON.parse(fs.readFileSync(channelDataPath, "utf8"));
    if (data.channelId) {
      allowedChannelIds = [data.channelId];
    } else if (data.channelIds) {
      allowedChannelIds = data.channelIds;
    }
  } catch (err) {
    console.error("Error loading translation channels:", err);
    allowedChannelIds = [];
  }
}
reloadTranslationChannels();

const buttonsAdded = new Map();
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  for (const [messageId, timestamp] of buttonsAdded.entries()) {
    if (now - timestamp > fiveMinutes) {
      buttonsAdded.delete(messageId);
    }
  }
}, 60 * 1000);

client.on("messageCreate", async (message) => {
  if (message.author?.bot) return;
  if (!message.content) return;

  if (!allowedChannelIds.includes(message.channel.id)) return;

  if (buttonsAdded.has(message.id)) return;

  try {
    const users = loadUserData();
    const userIds = Object.keys(users);
    if (!userIds.length) return;

    const detection = await deeplTranslator.translateText(message.content, null, "EN-US");
    const detectedLang = (detection.detectedSourceLang || "EN").toUpperCase();

    const autoTranslateUsers = [];
    const buttonModeUsers = [];

    for (const id of userIds) {
      const pref = getUserPref(id);
      if (!pref?.lang || languagesMatch(pref.lang, detectedLang)) continue;
      
      if (pref.mode === "auto") {
        autoTranslateUsers.push({ userId: id, pref });
      } else {
        buttonModeUsers.push({ userId: id, pref });
      }
    }

    if (autoTranslateUsers.length > 0) {
      for (const { userId, pref } of autoTranslateUsers) {
        try {
          const cacheKey = `${message.content}::${pref.lang}`;
          let translatedText = translationCache[cacheKey]?.text;

          if (!translatedText) {
            const result = await deeplTranslator.translateText(
              message.content,
              detectedLang,
              pref.lang
            );
            translatedText = result.text;
            translationCache[cacheKey] = { text: translatedText, timestamp: Date.now() };
            fs.writeFileSync(cacheFilePath, JSON.stringify(translationCache, null, 2));
          }

          const user = await client.users.fetch(userId);
          await user.send(
            `🌍 **Auto-Translation** from ${detectedLang} → ${pref.lang}\n` +
            `📍 ${message.channel.name} - ${message.author.tag}:\n\n` +
            `**Original:** ${message.content}\n\n` +
            `**Translation:** ${translatedText}`
          ).catch(() => {
            console.log(`Cannot DM user ${userId} (DMs disabled or not accessible)`);
          });
        } catch (err) {
          handleDeeplError(err, `Auto-translate for user ${userId}`);
        }
      }
    }

    if (buttonModeUsers.length > 0) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`translate_${message.id}_${detectedLang}`)
          .setEmoji("🌍")
          .setLabel(`Translate (from ${detectedLang})`)
          .setStyle(ButtonStyle.Secondary)
      );

      const buttonMessage = await message.reply({ 
        components: [row], 
        allowedMentions: { repliedUser: false } 
      });
      buttonsAdded.set(message.id, Date.now());

      setTimeout(async () => {
        try {
          await buttonMessage.delete();
          buttonsAdded.delete(message.id);
        } catch (err) {
          console.log("Button message already deleted or not found");
        }
      }, 10 * 60 * 1000);
    }
  } catch (err) {
    handleDeeplError(err, "Button add");
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith("translate_")) return;

  const [_, messageId, detectedLang] = interaction.customId.split("_");
  try {
    const channel = interaction.channel;
    const originalMessage = await channel.messages.fetch(messageId);
    if (!originalMessage?.content) {
      await interaction.reply({ content: "⚠️ Message not found.", flags: 64 });
      return;
    }

    const pref = getUserPref(interaction.user.id);
    if (!pref?.lang) {
      await interaction.reply({ 
        content: "⚠️ Set your language first with `/setlanguage`.", 
        flags: 64 
      });
      return;
    }

    if (languagesMatch(pref.lang, detectedLang)) {
      await interaction.reply({
        content: `✅ Message is already in ${detectedLang}. No translation needed.`,
        flags: 64,
      });
      return;
    }

    const cacheKey = `${originalMessage.content}::${pref.lang}`;
    let translatedText = translationCache[cacheKey]?.text;

    if (!translatedText) {
      const result = await deeplTranslator.translateText(
        originalMessage.content,
        detectedLang,
        pref.lang
      );
      translatedText = result.text;
      translationCache[cacheKey] = { text: translatedText, timestamp: Date.now() };
      fs.writeFileSync(cacheFilePath, JSON.stringify(translationCache, null, 2));
    }

    await interaction.reply({
      content: `🌍 **Translation** (${detectedLang} → ${pref.lang}):\n${translatedText}`,
      flags: 64,
    });
  } catch (err) {
    handleDeeplError(err, "Button translation", interaction);
  }
});

function handleDeeplError(err, context, interaction = null) {
  console.error(`${context} error:`, err);
  
  let userMessage = "❌ Translation error occurred.";
  
  if (err.response?.status === 456) {
    userMessage = "⚠️ DeepL quota exceeded. Please try again later.";
  } else if (err.response?.status === 429) {
    userMessage = "⏳ Too many translation requests. Please wait a moment.";
  } else if (err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
    userMessage = "🌐 Cannot reach translation service. Please try again.";
  } else if (err.message?.includes("Unknown language")) {
    userMessage = "❌ Unsupported language detected. Please check your settings.";
  }

  if (interaction && !interaction.replied && !interaction.deferred) {
    interaction.reply({ content: userMessage, flags: 64 }).catch(() => {});
  }
}

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📋 Translation channels: ${allowedChannelIds.length > 0 ? allowedChannelIds.join(", ") : "None set"}`);
});

client.login(process.env.DISCORD_TOKEN);
