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
        .setLabel('🎭 Confession anonyme')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎭'),
      new ButtonBuilder()
        .setCustomId('confession_public')
        .setLabel('💬 Confession publique')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💬')
    );

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle("💭 Boîte à Confessions")
      .setDescription(`Partage tes pensées en toute confidentialité ou publiquement !
      
      🎭 **Confession anonyme** - Ton identité restera cachée
      💬 **Confession publique** - Ton nom sera affiché
      
      Toutes les confessions sont examinées par les modérateurs avant publication.`)
      .setColor(0x7289DA) // Discord blurple
      .setFooter({ text: "Panneau de Confession • Soyez respectueux !" })
      .setTimestamp();

    // Send the permanent message
    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({ content: "✅ Le panneau de confession a été créé !", ephemeral: true });
  }
};
