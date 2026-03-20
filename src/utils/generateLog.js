import { EmbedBuilder } from "discord.js";
import { getServerSettings } from "./serverSettings.js";
import { t } from "./i18n.js";

const actionKeyMap = {
    'Ban': 'log_action_ban',
    'Kick': 'log_action_kick',
    'Warn': 'log_action_warn',
    'Mute': 'log_action_mute',
    'Unmute': 'log_action_unmute',
    'Clear Messages': 'log_action_clear',
};

function getActionColor(action) {
    const colors = {
        'Ban': 0xFF0000,
        'Kick': 0xFF7F00,
        'Warn': 0xFFFF00,
        'Mute': 0x808080,
        'Unmute': 0x00FF00
    };
    return colors[action] || 0x0099FF;
}

/**
 * Logs a moderation action to the log channel.
 */
export async function sendLog(guild, { action, target, moderator, reason, extra }) {
    try {
        const settings = await getServerSettings(guild.id);
        const lang = settings.language || 'en';

        if (!settings.log_channel_id) {
            console.log("No log channel configured for guild:", guild.id);
            return;
        }

        const channel = guild.channels.cache.get(settings.log_channel_id);
        if (!channel) {
            console.warn("⚠ No log channel found.");
            return;
        }

        const targetValue = target?.id
            ? `<@${target.id}> (${target.tag})`
            : t('log_unknown_user', lang);
        const moderatorValue = moderator?.id
            ? `<@${moderator.id}> (${moderator.tag})`
            : t('log_unknown_moderator', lang);
        const reasonValue = reason || t('no_reason', lang);

        const actionKey = actionKeyMap[action];
        const actionDisplay = actionKey ? t(actionKey, lang) : action;

        const embed = new EmbedBuilder()
            .setTitle(t('log_title', lang, { action: actionDisplay }))
            .setColor(getActionColor(action))
            .setTimestamp()
            .addFields(
                { name: t('log_field_target', lang), value: targetValue },
                { name: t('log_field_moderator', lang), value: moderatorValue },
                { name: t('log_field_reason', lang), value: reasonValue }
            );

        if (extra !== undefined && extra !== null) {
            embed.addFields({ name: t('log_field_extra', lang), value: String(extra) });
        }

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error("sendLog() failed:", err);
    }
}
