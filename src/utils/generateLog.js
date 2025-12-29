import { EmbedBuilder } from "discord.js";

/**
 * Logs a moderation action to the log channel.
 */
export async function sendLog(guild, { action, target, moderator, reason, extra }) {
    try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        const channel = guild.channels.cache.get(logChannelId);

        if (!channel) {
            console.warn("⚠ No log channel found.");
            return;
        }

        // Ensure all fields are strings and fallback to defaults
        const targetValue = target ? `<@${target.id}> (${target.tag})` : "Unknown user";
        const moderatorValue = moderator ? `<@${moderator.id}> (${moderator.tag})` : "Unknown moderator";
        const reasonValue = reason || "No reason provided";

        const embed = new EmbedBuilder()
            .setTitle(`🔧 Moderation | ${action}`)
            .setColor("Red")
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
