import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, User, ButtonInteraction } from "discord.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import sql from '../db.js';
import type { Command } from '../types/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("sanction")
        .setDescription("Check a user's moderation record")
        .addUserOption(option =>
            option.setName("user")
                  .setDescription("User to check sanctions for")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const targetUser = interaction.options.getUser("user") as User;
        await showSanctionPage(interaction, targetUser, 0, false);
    }
} satisfies Command;

export { showSanctionPage };

async function showSanctionPage(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    targetUser: User,
    page: number,
    isUpdate: boolean = false
): Promise<void> {
    const SANCTIONS_PER_PAGE = 15;
    const offset = page * SANCTIONS_PER_PAGE;

    const settings = await getServerSettings(interaction.guild!.id);
    const lang = settings.language || 'en';
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

    try {
        const totalResult = await sql`
            SELECT COUNT(*) as total FROM mod_logs WHERE target_id = ${targetUser.id} AND guild_id = ${interaction.guild!.id}
        `;
        const totalSanctions = parseInt(totalResult[0].total);
        const totalPages = Math.ceil(totalSanctions / SANCTIONS_PER_PAGE);

        const sanctions = await sql`
            SELECT id, action, moderator_id, reason, created_at
            FROM mod_logs
            WHERE target_id = ${targetUser.id} AND guild_id = ${interaction.guild!.id}
            ORDER BY created_at DESC
            LIMIT ${SANCTIONS_PER_PAGE} OFFSET ${offset}
        `;

        const embed = new EmbedBuilder()
            .setTitle(t('sanction_embed_title', lang))
            .setAuthor({
                name: targetUser.displayName,
                iconURL: targetUser.displayAvatarURL()
            })
            .setColor(sanctions.length > 0 ? 0xFF6B6B : 0x51CF66)
            .setTimestamp();

        let components: ActionRowBuilder<ButtonBuilder>[] = [];

        if (totalSanctions === 0) {
            embed.setDescription(t('sanction_clean', lang));
        } else {
            const pageInfo = totalPages > 1 ? t('sanction_page_info', lang, { page: page + 1, total: totalPages }) : '';
            embed.setDescription(t('sanction_total', lang, { total: totalSanctions, pageInfo }));

            const actionEmojis: Record<string, string> = { 'ban': '⛔', 'kick': '👢', 'mute': '🔇', 'warn': '⚠️', 'unmute': '🔊' };

            let sanctionText = "";
            for (let i = 0; i < sanctions.length; i++) {
                const sanction = sanctions[i];
                const globalNumber = offset + i + 1;
                const date = new Date(sanction.created_at).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                sanctionText += `**${globalNumber}.** ${actionEmojis[sanction.action] || '⚠️'} ${sanction.action} - ${date}\n`;
            }

            embed.addFields({ name: t('sanction_field_actions', lang), value: sanctionText, inline: false });

            const row1 = new ActionRowBuilder<ButtonBuilder>();

            if (page > 0) {
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sanction_prev_${targetUser.id}_${page - 1}`)
                        .setLabel(t('sanction_btn_prev', lang))
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sanction_view_${targetUser.id}_${page}`)
                    .setLabel(t('sanction_btn_details', lang))
                    .setStyle(ButtonStyle.Primary)
            );

            if (page < totalPages - 1) {
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sanction_next_${targetUser.id}_${page + 1}`)
                        .setLabel(t('sanction_btn_next', lang))
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            components = [row1];
        }

        if (isUpdate) {
            await (interaction as ButtonInteraction).update({ embeds: [embed], components });
        } else {
            await interaction.reply({ embeds: [embed], components, ephemeral: true });
        }

    } catch (error) {
        console.error('Sanction Command Error:', error);
        const content = t('sanction_failed', lang);

        if (isUpdate) {
            await (interaction as ButtonInteraction).update({ content, embeds: [], components: [] });
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
    }
}
