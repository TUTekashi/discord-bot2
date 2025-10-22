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

// Load all commands
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

// Slash command handler
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Error executing command.", flags: 64 });
    }
  }
});

// --- DeepL & data setup ---
const userFilePath = path.join(__dirname, "./data/userLanguages.json");
const deeplTranslator = new deepl.Translator(process.env.DEEPL_KEY);

// Cache for translations
const cacheFilePath = path.join(__dirname, "./data/cache.json");
let translationCache = {};
if (!fs.existsSync(cacheFilePath)) fs.writeFileSync(cacheFilePath, "{}");
translationCache = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));

// Auto-clean cache every 6h
setInterval(() => {
  const now = Date.now();
  for (const key in translationCache) {
    if (now - translationCache[key].timestamp > 6 * 60 * 60 * 1000) delete translationCache[key];
  }
  fs.writeFileSync(cacheFilePath, JSON.stringify(translationCache, null, 2));
}, 6 * 60 * 60 * 1000);

// --- User prefs helpers ---
function loadUserData() {
  if (!fs.existsSync(userFilePath)) fs.writeFileSync(userFilePath, "{}");
  const text = fs.readFileSync(userFilePath, "utf8").trim();
  return text ? JSON.parse(text) : {};
}

function getUserPref(userId) {
  const users = loadUserData();
  const raw = users[userId];
  if (!raw) return null;
  if (typeof raw === "string") return { lang: normalizeLang(raw), style: "natural" };
  return { lang: normalizeLang(raw.lang || ""), style: raw.style || "natural" };
}

function normalizeLang(lang) {
  if (!lang) return "";
  let l = lang.toUpperCase();
  if (l === "EN") l = "EN-US";
  if (l === "PT") l = "PT-PT";
  if (l === "ZH") l = "ZH-HANS";
  return l;
}

// --- Allowed translation channel ---
const channelDataPath = path.join(__dirname, "./data/translateChannel.json");
if (!fs.existsSync(channelDataPath)) fs.writeFileSync(channelDataPath, '{"channelId":""}');

// --- Guard to prevent duplicate buttons ---
const buttonsAdded = new Set();

// --- MessageCreate handler with button ---
client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author?.bot) return;
  if (!message.content) return;

  // Only allowed channel
  const channelData = JSON.parse(fs.readFileSync(channelDataPath, "utf8"));
  const allowedChannel = channelData.channelId || "";
  if (!allowedChannel || message.channel.id !== allowedChannel) return;

  // Prevent duplicate button
  if (buttonsAdded.has(message.id)) return;

  try {
    const users = loadUserData();
    const userIds = Object.keys(users);
    if (!userIds.length) return;

    // Detect language via DeepL
    const detection = await deeplTranslator.translateText(message.content, null, "EN-US");
    const detectedLang = (detection.detectedSourceLang || "EN").toUpperCase();

    // Check if any user needs translation
    const needTranslation = userIds.some((id) => {
      const pref = getUserPref(id);
      return pref?.lang && pref.lang !== detectedLang;
    });
    if (!needTranslation) return;

    // Add Translate button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translate_${message.id}_${detectedLang}`)
        .setEmoji("🌍")
        .setLabel("Translate")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ components: [row], allowedMentions: { repliedUser: false } });
    buttonsAdded.add(message.id);
  } catch (err) {
    console.error("Button add error:", err);
  }
});

// --- Handle Translate button clicks ---
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
      await interaction.reply({ content: "⚠️ Set language first with `/setlanguage`.", flags: 64 });
      return;
    }

    if (pref.lang === detectedLang) {
      await interaction.reply({
        content: "✅ Your language matches the message. No translation needed.",
        flags: 64,
      });
      return;
    }

    const cacheKey = `${originalMessage.content}::${pref.lang}`;
    let translatedText = translationCache[cacheKey]?.text;

    if (!translatedText) {
      const result = await deeplTranslator.translateText(originalMessage.content, detectedLang, pref.lang);
      translatedText = result.text;
      translationCache[cacheKey] = { text: translatedText, timestamp: Date.now() };
      fs.writeFileSync(cacheFilePath, JSON.stringify(translationCache, null, 2));
    }

    await interaction.reply({
      content: `🌍 **Translation (${pref.lang}):** ${translatedText}`,
      flags: 64, // ephemeral
    });
  } catch (err) {
    console.error("Button translation error:", err);
    await interaction.reply({ content: "❌ Error processing translation.", flags: 64 });
  }
});

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
