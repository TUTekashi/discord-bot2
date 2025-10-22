const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/userLanguages.json");

// ✅ Ensure file exists and is valid JSON
function loadUserData() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "{}");
    }
    const text = fs.readFileSync(filePath, "utf8").trim();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Corrupt userLanguages.json — resetting:", err);
    fs.writeFileSync(filePath, "{}");
    return {};
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlanguage')
    .setDescription('Set your preferred language')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('Language code (e.g. en, es, fr)')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 }); // instead of reply()

      const langCode = interaction.options.getString('code');
      const userId = interaction.user.id;
      const users = loadUserData();
      users[userId] = langCode;

      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

      await interaction.editReply({
        content: `✅ Your language has been set to **${langCode}**.`,
      });
    } catch (err) {
      console.error('Error in setlanguage:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: '❌ Error executing command.',
          flags: 64,
        });
      } else {
        await interaction.reply({
          content: '❌ Error executing command.',
          flags: 64,
        });
      }
    }
  },
};
