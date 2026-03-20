import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("Set up the ticket panel in this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const settings = await getServerSettings(interaction.guild.id);
        const lang = settings.language || 'en';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open')
                .setLabel(t('ticket_panel_btn', lang))
                .setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setTitle(t('ticket_panel_title', lang))
            .setDescription(t('ticket_panel_description', lang))
            .setColor("Purple")
            .setFooter({ text: t('ticket_panel_footer', lang) })
            .setTimestamp();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: t('ticket_panel_created', lang), ephemeral: true });
    }
};
