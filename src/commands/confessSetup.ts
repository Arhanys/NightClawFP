import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChatInputCommandInteraction, TextChannel } from "discord.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import type { Command } from '../types/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("confessionsetup")
        .setDescription("Set up the confession panel in this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('confession_anonymous')
                .setLabel(t('confession_panel_btn_anon', lang))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('confession_public')
                .setLabel(t('confession_panel_btn_public', lang))
                .setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setTitle(t('confession_panel_title', lang))
            .setDescription(t('confession_panel_description', lang))
            .setColor(0x7289DA)
            .setFooter({ text: t('confession_panel_footer', lang) })
            .setTimestamp();

        await (interaction.channel as TextChannel).send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: t('confession_panel_created', lang), ephemeral: true });
    }
} satisfies Command;
