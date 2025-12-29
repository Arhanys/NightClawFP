import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("confessionsetup")
    .setDescription("Set up the confession panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // only admins can use

  async execute(interaction) {
    // Create the confession buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confession_anonymous')
        .setLabel('🎭 Anonymous Confession')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎭'),
      new ButtonBuilder()
        .setCustomId('confession_public')
        .setLabel('💬 Public Confession')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💬')
    );

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle("💭 Confession Box")
      .setDescription(`Share what's on your mind!
      
      🎭 **Anonymous Confession** - Your identity will remain hidden
      💬 **Public Confession** - Your name will be shown
      
      All confessions are reviewed by moderators before posting.`)
      .setColor(0x7289DA) // Discord blurple
      .setFooter({ text: "Confession Panel • Be respectful!" })
      .setTimestamp();

    // Send the permanent message
    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({ content: "✅ Confession panel has been created!", ephemeral: true });
  }
};
