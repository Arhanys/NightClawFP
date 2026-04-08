import { ButtonInteraction, TextChannel, NonThreadGuildBasedChannel, MessageFlags } from "discord.js";
import sql from '../db.js';
import { getServerSettings, hasModeratorRole } from './serverSettings.js';
import { t } from './i18n.js';

export async function handleIsolateButton(interaction: ButtonInteraction): Promise<void> {
    const { customId, guild } = interaction;

    if (customId !== 'isolate_end') return;

    const settings = await getServerSettings(guild!.id);
    const lang = settings.language || 'en';

    const hasPerms = await hasModeratorRole(interaction.member as any, guild!.id);
    if (!hasPerms) {
        return void interaction.reply({ content: t('unisolate_no_permission', lang), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel as TextChannel;

    const records = await sql`
        SELECT * FROM isolated_users
        WHERE channel_id = ${channel.id} AND guild_id = ${guild!.id}
    `;

    if (records.length === 0) {
        return void interaction.editReply({ content: t('unisolate_not_found', lang) });
    }

    const record = records[0];

    try {
        // Remove the user's ViewChannel deny from all channels they were restricted on
        const channels = [...guild!.channels.cache.values()].filter(
            (c): c is NonThreadGuildBasedChannel => !c.isThread()
        );
        await Promise.all(
            channels.map(c =>
                c.permissionOverwrites.delete(record.user_id).catch(() => {})
            )
        );

        await sql`
            DELETE FROM isolated_users WHERE channel_id = ${channel.id} AND guild_id = ${guild!.id}
        `;

        await interaction.editReply({ content: t('unisolate_success', lang) });
        await channel.delete();

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: t('unisolate_failed', lang) });
    }
}
