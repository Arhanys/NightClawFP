import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Issue a warning to a member")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to warn")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the warning")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild.id;

        // Check if user has permission using server-specific settings
        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: '❌ You do not have permission to warn members.',
                ephemeral: true
            });
        }

        if (!member) {
            return interaction.reply({ content: "Member not found.", ephemeral: true });
        }

        try {
            // Log to database
            await logToDatabase({
                guild_id: guildId,
                action: 'warn',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
            });

            // Increment warnings count in users table
            await sql`
                INSERT INTO users (id, username, warnings, guild_id, created_at) 
                VALUES (${member.user.id}, ${member.user.username}, 1, ${guildId}, NOW())
                ON CONFLICT (id, guild_id) DO UPDATE SET 
                warnings = users.warnings + 1,
                username = ${member.user.username}
            `;

            // Get updated warning count
            const [userRecord] = await sql`
                SELECT warnings FROM users WHERE id = ${member.user.id} AND guild_id = ${guildId}
            `;
            const warningCount = userRecord?.warnings || 0;

            let replyContent = `⚠️ ${member.user.tag} has been warned.\n📌 Reason: ${reason}\n🔢 Total warnings: ${warningCount}`;
            
            if (warningCount >= 3) {
                replyContent += '\n⚠️ **Warning:** This user now has 3+ warnings. Consider issuing a ban.';
            }
            
            await interaction.reply({ 
                content: replyContent, 
                ephemeral: true 
            });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('⚠️ User Warned')
                .setColor(0xFFFF00)
                .addFields(
                    { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Total Warnings', value: warningCount.toString(), inline: true },
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
                    action: "Warn",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to warn the member.", ephemeral: true });
        }
    }
};