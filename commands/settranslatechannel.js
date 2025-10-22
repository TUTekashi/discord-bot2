const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const filePath = path.join(__dirname,'..','data','translateChannel.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settranslatechannel')
    .setDescription('Set channels where message translation is enabled (Admin only)')
    .addChannelOption(opt => opt
      .setName('channel')
      .setDescription('Select the channel')
      .setRequired(true)
    )
    .addStringOption(opt => opt
      .setName('action')
      .setDescription('Add or remove this channel')
      .setRequired(false)
      .addChoices(
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' }
      )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ 
        content: '❌ Only administrators can manage translation channels.', 
        ephemeral: true 
      });
      return;
    }

    const channel = interaction.options.getChannel('channel');
    const action = interaction.options.getString('action') || 'add';
    
    let data = { channelIds: [] };
    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (existing.channelId) {
        data.channelIds = [existing.channelId];
      } else if (existing.channelIds) {
        data.channelIds = existing.channelIds;
      }
    }

    if (action === 'add') {
      if (!data.channelIds.includes(channel.id)) {
        data.channelIds.push(channel.id);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        await interaction.reply({ 
          content: `✅ Translation enabled in ${channel}\n\nUsers can now right-click messages and select **"Translate Message"**.`, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `⚠️ ${channel} is already a translation channel.`, 
          ephemeral: true 
        });
      }
    } else {
      const index = data.channelIds.indexOf(channel.id);
      if (index > -1) {
        data.channelIds.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        await interaction.reply({ 
          content: `✅ Translation disabled in ${channel}`, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `⚠️ ${channel} is not a translation channel.`, 
          ephemeral: true 
        });
      }
    }
  }
}
