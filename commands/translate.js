const { ContextMenuCommandBuilder, ApplicationCommandType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const deepl = require("deepl-node");

const deeplTranslator = new deepl.Translator(process.env.DEEPL_KEY);
const userFilePath = path.join(__dirname, "../data/userLanguages.json");
const channelDataPath = path.join(__dirname, "../data/translateChannel.json");
const cacheFilePath = path.join(__dirname, "../data/cache.json");

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
    return normalizeLang(raw);
  }
  return normalizeLang(raw.lang || "");
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
  return lang.toUpperCase().split("-")[0];
}

function languagesMatch(lang1, lang2) {
  if (!lang1 || !lang2) return false;
  const base1 = getBaseLang(lang1);
  const base2 = getBaseLang(lang2);
  return base1 === base2;
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

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Translate Message")
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const message = interaction.targetMessage;
      
      if (!message.content) {
        await interaction.editReply({
          content: "❌ This message has no text content to translate.",
        });
        return;
      }

      if (!isAllowedChannel(message.channel.id)) {
        await interaction.editReply({
          content: "⚠️ Translation is not enabled in this channel. Ask an admin to use `/settranslatechannel`.",
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

      const detection = await deeplTranslator.translateText(message.content, null, "EN-US");
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
          userLang
        );
        translatedText = result.text;
        cache[cacheKey] = { text: translatedText, timestamp: Date.now() };
        saveTranslationCache(cache);
      }

      await interaction.editReply({
        content: 
          `🌍 **Translation** (${detectedLang} → ${userLang})\n` +
          `**From:** ${message.author.tag}\n\n` +
          `**Original:**\n${message.content}\n\n` +
          `**Translation:**\n${translatedText}`
      });

    } catch (err) {
      console.error("Translation error:", err);
      
      let errorMessage = "❌ Translation error occurred.";
      
      if (err.response?.status === 456) {
        errorMessage = "⚠️ DeepL quota exceeded. Please try again later.";
      } else if (err.response?.status === 429) {
        errorMessage = "⏳ Too many translation requests. Please wait a moment.";
      } else if (err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
        errorMessage = "🌐 Cannot reach translation service. Please try again.";
      }

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
