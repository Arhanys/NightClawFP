import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';

export default {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Temporarily mute a member")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to mute")
                  .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("time")
                  .setDescription("Time in minutes")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the mute")
                  .setRequired(true)
        )
        
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const time = interaction.options.getInteger("time");
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild.id;
        
        // Check if user has permission using server-specific settings
        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: '❌ You do not have permission to mute members.',
                ephemeral: true
            });
        }
        
        // Check if member is kickable/mutable
        if (!member.moderatable)
            return interaction.reply({ content: "I cannot mute this member.", ephemeral: true });

        // Convert minutes to milliseconds
        const durationMs = time * 60 * 1000;
        const expiresAt = new Date(Date.now() + durationMs);

        try {
            await member.timeout(durationMs, reason);
            
            // Log to database
            await logToDatabase({
                guild_id: guildId,
                action: 'mute',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
            });

            await interaction.reply({ content: `🔇 ${member.user.tag} has been muted for ${time} minute(s).\n📌 Reason: ${reason}`, ephemeral: true });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor(0xFFFF00)
                .addFields(
                    { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Duration', value: `${time} minutes`, inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();
                
            // Get server settings and send to log channel if configured
            const settings = await getServerSettings(guildId);
            if (settings.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id);
                if (logChannel) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                // Fallback to old log system
                await sendLog(interaction.guild, {
                    action: "Mute",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason,
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to mute the member.", ephemeral: true });
        }
    }
};
