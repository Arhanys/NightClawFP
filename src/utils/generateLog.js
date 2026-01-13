import { EmbedBuilder } from "discord.js";
import { getServerSettings } from "./serverSettings.js";

/**
 * Logs a moderation action to the log channel.
 */
export async function sendLog(guild, { action, target, moderator, reason, extra }) {
    try {
        const settings = await getServerSettings(guild.id);

        if (!settings.log_channel_id) {
            console.log("No log channel configured for guild:", guild.id);
            return;
        }
        
        const channel = guild.channels.cache.get(settings.log_channel_id);

        if (!channel) {
            console.warn("⚠ No log channel found.");
            return;
        }

        // Ensure all fields are strings and fallback to defaults
        const targetValue = target ? `<@${target.id}> (${target.tag})` : "Unknown user";
        const moderatorValue = moderator ? `<@${moderator.id}> (${moderator.tag})` : "Unknown moderator";
        const reasonValue = reason || "No reason provided";

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
        const embed = new EmbedBuilder()
            .setTitle(`🔧 Moderation | ${action}`)
            .setColor(getActionColor(action))
            .setTimestamp()
            .addFields(
                { name: "👤 Target", value: targetValue },
                { name: "🛠 Moderator", value: moderatorValue },
                { name: "📄 Reason", value: reasonValue }
            );

        if (extra !== undefined && extra !== null) {
            embed.addFields({ name: "➕ Extra", value: String(extra) });
        }

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error("sendLog() failed:", err);
    }
}
