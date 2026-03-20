import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName("banappeal-panel")
        .setDescription("Post the ban appeal panel in this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const settings = await getServerSettings(interaction.guild.id);
        const lang = settings.language || 'en';

        const embed = new EmbedBuilder()
            .setTitle(t('appeal_panel_title', lang))
            .setDescription(t('appeal_panel_description', lang))
            .setColor(0xFF0000)
            .setFooter({ text: t('appeal_panel_footer', lang) });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('appeal_open')
                .setLabel(t('appeal_panel_btn', lang))
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: t('appeal_panel_created', lang), ephemeral: true });
    }
};
