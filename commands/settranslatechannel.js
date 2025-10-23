const fs = require("fs");
const path = require("path");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const filePath = path.join(__dirname, "..", "data", "translateChannel.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settranslatechannel")
    .setDescription("Set or remove channels where message translation is enabled (Admin only)")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Select the channel to enable/disable translations")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("Add or remove this channel")
        .setRequired(false)
        .addChoices(
          { name: "Add", value: "add" },
          { name: "Remove", value: "remove" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // --- Admin Check ---
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "❌ Only administrators can manage translation channels.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.options.getChannel("channel");
    const action = interaction.options.getString("action") || "add";

    // --- Load or create data file ---
    let data = { channelIds: [] };
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const existing = JSON.parse(raw || "{}");
        if (existing.channelId) data.channelIds = [existing.channelId];
        else if (existing.channelIds) data.channelIds = existing.channelIds;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error("Error reading translateChannel.json:", err);
      await interaction.reply({
        content: "⚠️ Failed to read channel configuration file.",
        ephemeral: true,
      });
      return;
    }

    // --- Add or remove channel ---
    if (action === "add") {
      if (!data.channelIds.includes(channel.id)) {
        data.channelIds.push(channel.id);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        await interaction.reply({
          content: `✅ Translation enabled in ${channel}.\n\nUsers can now click the **🌍 Translate** button to translate messages here.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `⚠️ ${channel} is already a translation channel.`,
          ephemeral: true,
        });
      }
    } else {
      const index = data.channelIds.indexOf(channel.id);
      if (index > -1) {
        data.channelIds.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        await interaction.reply({
          content: `✅ Translation disabled in ${channel}.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `⚠️ ${channel} is not currently a translation channel.`,
          ephemeral: true,
        });
      }
    }
  },
};
