const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');
const filePath = path.join(__dirname,'..','data','translateChannel.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settranslatechannel')
    .setDescription('Set the channel where translation buttons will appear')
    .addChannelOption(opt => opt
      .setName('channel')
      .setDescription('Select the channel')
      .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const data = { channelId: channel.id };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    await interaction.reply({ content: `✅ Translation buttons will now only appear in ${channel}`, flags: 64 });
  }
}
