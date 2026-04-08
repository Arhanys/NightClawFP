import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonInteraction, ModalSubmitInteraction, MessageFlags } from "discord.js";
import sql from '../db.js';
import { getServerSettings } from './serverSettings.js';
import { t } from './i18n.js';

export async function logToDatabase({ guild_id, action, target_id, moderator_id, reason }: {
    guild_id: string;
    action: string;
    target_id: string;
    moderator_id: string;
    reason: string;
}): Promise<void> {
    try {
        await sql`
            INSERT INTO mod_logs (guild_id, action, target_id, moderator_id, reason, created_at)
            VALUES (${guild_id}, ${action}, ${target_id}, ${moderator_id}, ${reason}, NOW())
        `;
    } catch (error) {
        console.error('Error logging to database:', error);
    }
}

export async function handleSanctionButton(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction;

    const settings = await getServerSettings(interaction.guild!.id);
    const lang = settings.language || 'en';

    if (customId.startsWith('sanction_view_')) {
        const parts = customId.replace('sanction_view_', '').split('_');
        const userId = parts[0];
        const page = parseInt(parts[1]) || 0;

        const modal = new ModalBuilder()
            .setCustomId(`sanction_modal_${userId}_${page}`)
            .setTitle(t('sanction_modal_title', lang));

        const sanctionInput = new TextInputBuilder()
            .setCustomId('sanction_number')
            .setLabel(t('sanction_input_label', lang))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(t('sanction_input_placeholder', lang))
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(4);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(sanctionInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    else if (customId.startsWith('sanction_prev_') || customId.startsWith('sanction_next_')) {
        const parts = customId.split('_');
        const userId = parts[2];
        const newPage = parseInt(parts[3]);

        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return void interaction.reply({ content: t('sanction_user_not_found', lang), flags: MessageFlags.Ephemeral });
        }

        const { showSanctionPage } = await import('../commands/sanction.js');
        await showSanctionPage(interaction, targetUser, newPage, true);
    }
}

export async function handleSanctionModal(interaction: ModalSubmitInteraction): Promise<void> {
    const { customId, fields } = interaction;

    if (customId.startsWith('sanction_modal_')) {
        const parts = customId.replace('sanction_modal_', '').split('_');
        const userId = parts[0];
        const page = parseInt(parts[1]) || 0;
        const sanctionNumber = parseInt(fields.getTextInputValue('sanction_number'));

        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        if (isNaN(sanctionNumber) || sanctionNumber < 1) {
            return void interaction.reply({ content: t('sanction_invalid_number', lang), flags: MessageFlags.Ephemeral });
        }

        try {
            const totalResult = await sql`
                SELECT COUNT(*) as total FROM mod_logs WHERE target_id = ${userId} AND guild_id = ${interaction.guild!.id}
            `;
            const totalSanctions = parseInt(totalResult[0].total);

            if (sanctionNumber > totalSanctions) {
                return void interaction.reply({
                    content: t('sanction_not_found_count', lang, { n: sanctionNumber, total: totalSanctions }),
                    flags: MessageFlags.Ephemeral
                });
            }

            const sanction = await sql`
                SELECT id, action, moderator_id, reason, created_at, target_id
                FROM mod_logs
                WHERE target_id = ${userId} AND guild_id = ${interaction.guild!.id}
                ORDER BY created_at DESC
                LIMIT 1 OFFSET ${sanctionNumber - 1}
            `;

            if (sanction.length === 0) {
                return void interaction.reply({
                    content: t('sanction_not_found', lang, { n: sanctionNumber }),
                    flags: MessageFlags.Ephemeral
                });
            }

            const sanctionData = sanction[0];

            const moderator = await interaction.client.users.fetch(sanctionData.moderator_id).catch(() => null);
            const targetUser = await interaction.client.users.fetch(sanctionData.target_id).catch(() => null);

            const moderatorName = moderator ? moderator.displayName : t('unknown_moderator', lang);
            const targetName = targetUser ? targetUser.displayName : t('unknown_user', lang);

            const actionEmojis: Record<string, string> = { 'ban': '⛔', 'kick': '👢', 'mute': '🔇', 'warn': '⚠️', 'unmute': '🔊' };

            const embed = new EmbedBuilder()
                .setTitle(t('sanction_detail_title', lang, { emoji: actionEmojis[sanctionData.action] || '⚠️', n: sanctionNumber }))
                .setColor(0xFF6B6B)
                .addFields(
                    { name: t('field_target', lang), value: targetName, inline: true },
                    { name: t('field_moderator', lang), value: moderatorName, inline: true },
                    { name: t('field_action', lang), value: sanctionData.action, inline: true },
                    { name: t('field_date', lang), value: `<t:${Math.floor(new Date(sanctionData.created_at).getTime() / 1000)}:F>`, inline: false },
                    { name: t('field_reason', lang), value: sanctionData.reason || t('no_reason', lang), inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('Sanction Detail Error:', error);
            await interaction.reply({ content: t('sanction_detail_failed', lang), flags: MessageFlags.Ephemeral });
        }
    }
}
