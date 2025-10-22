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
    .setDescription('Set your preferred language and translation mode')
    .addStringOption(option =>
      option.setName('language')
        .setDescription('Your preferred language')
        .setRequired(true)
        .addChoices(
          { name: 'Arabic', value: 'AR' },
          { name: 'Bulgarian', value: 'BG' },
          { name: 'Chinese', value: 'ZH-HANS' },
          { name: 'Czech', value: 'CS' },
          { name: 'Dutch', value: 'NL' },
          { name: 'English', value: 'EN-US' },
          { name: 'Finnish', value: 'FI' },
          { name: 'French', value: 'FR' },
          { name: 'German', value: 'DE' },
          { name: 'Greek', value: 'EL' },
          { name: 'Hungarian', value: 'HU' },
          { name: 'Italian', value: 'IT' },
          { name: 'Japanese', value: 'JA' },
          { name: 'Korean', value: 'KO' },
          { name: 'Latvian', value: 'LV' },
          { name: 'Lithuanian', value: 'LT' },
          { name: 'Polish', value: 'PL' },
          { name: 'Portuguese', value: 'PT-BR' },
          { name: 'Russian', value: 'RU' },
          { name: 'Slovak', value: 'SK' },
          { name: 'Slovenian', value: 'SL' },
          { name: 'Spanish', value: 'ES' },
          { name: 'Swedish', value: 'SV' },
          { name: 'Turkish', value: 'TR' },
          { name: 'Ukrainian', value: 'UK' }
        )
    )
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Translation mode (default: button)')
        .setRequired(false)
        .addChoices(
          { name: 'Button - Click to translate', value: 'button' },
          { name: 'Auto - Automatically translate all messages', value: 'auto' }
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const langCode = interaction.options.getString('language');
      const mode = interaction.options.getString('mode') || 'button';
      const userId = interaction.user.id;
      const users = loadUserData();
      
      users[userId] = {
        lang: langCode,
        mode: mode
      };

      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

      const modeText = mode === 'auto' ? '(Auto-translate enabled)' : '(Click button to translate)';
      await interaction.editReply({
        content: `✅ Your language has been set to **${langCode}** ${modeText}`,
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
