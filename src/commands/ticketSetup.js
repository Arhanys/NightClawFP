import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Set up the ticket panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // only admins can use

  async execute(interaction) {
    // Create the "Open Ticket" button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Tickets")
      .setDescription("Click the button below to create a private ticket. Our staff will assist you shortly!")
      .setColor("Purple")
      .setFooter({ text: "Support Panel" })
      .setTimestamp();

    // Send the permanent message
    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({ content: "✅ Ticket panel has been created!", ephemeral: true });
  }
};
