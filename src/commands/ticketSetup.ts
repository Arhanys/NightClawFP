import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChatInputCommandInteraction, TextChannel, MessageFlags } from "discord.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import sql from '../db.js';
import type { Command } from '../types/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("Set up the ticket panel in this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
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

        await (interaction.channel as TextChannel).send({ embeds: [embed], components: [row] });

        await sql`
            INSERT INTO server_settings (guild_id, ticket_panel_channel_id)
            VALUES (${interaction.guild!.id}, ${interaction.channel!.id})
            ON CONFLICT (guild_id) DO UPDATE SET ticket_panel_channel_id = ${interaction.channel!.id}
        `;

        await interaction.reply({ content: t('ticket_panel_created', lang), flags: MessageFlags.Ephemeral });
    }
} satisfies Command;
