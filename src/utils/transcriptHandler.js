import { EmbedBuilder } from 'discord.js';
import { createTranscript } from 'discord-html-transcripts';
import { getServerSettings } from './serverSettings.js';
import { t } from './i18n.js';

export async function generateAndUploadTranscript(channel, closedBy, guild) {
    try {
        const settings = await getServerSettings(guild.id);
        const lang = settings.language || 'en';

        if (!settings.log_channel_id) {
            console.log('No log channel configured, skipping transcript for guild:', guild.id);
            return null;
        }

        const logChannel = guild.channels.cache.get(settings.log_channel_id);
        if (!logChannel) {
            console.warn('⚠ Log channel not found in cache, skipping transcript.');
            return null;
        }

        const attachment = await createTranscript(channel, {
            filename: `transcript-${channel.name}.html`,
            saveImages: false,
            poweredBy: false
        });

        const embed = new EmbedBuilder()
            .setTitle(t('ticket_transcript_log_title', lang))
            .setColor(0x9B59B6)
            .setTimestamp()
            .addFields(
                { name: t('ticket_transcript_field_channel', lang), value: channel.name },
                { name: t('ticket_transcript_field_closed_by', lang), value: `<@${closedBy.id}>` }
            );

        const sentMsg = await logChannel.send({ embeds: [embed], files: [attachment] });
        return sentMsg.attachments.first()?.url ?? null;
    } catch (err) {
        console.error('generateAndUploadTranscript() failed:', err);
        return null;
    }
}
