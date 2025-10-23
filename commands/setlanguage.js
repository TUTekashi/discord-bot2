const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { saveUserPref } = require("../utils/userPrefs.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlanguage')
    .setDescription('Set your preferred language for translations')
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
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const langCode = interaction.options.getString('language');
      const userId = interaction.user.id;
      
      saveUserPref(userId, langCode);

      await interaction.editReply({
        content: `✅ Your language has been set to **${langCode}**\n\nYou can now right-click any message and select **"Translate Message"** to see translations in your language.`,
      });
    } catch (err) {
      console.error('Error in setlanguage:', err);
      const errorMsg = { content: '❌ Error executing command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorMsg).catch(() => {});
      } else {
        await interaction.reply(errorMsg).catch(() => {});
      }
    }
  },
};
