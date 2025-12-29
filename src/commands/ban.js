import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member from the server")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to ban")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the ban")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild.id;

        // Check if user has permission using server-specific settings
        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: '❌ You do not have permission to ban members.',
                ephemeral: true
            });
        }

        if (!member.bannable)
            return interaction.reply({ content: "I cannot ban this member.", ephemeral: true });

        try {
            await member.ban({ reason });
            
            // Log to database
            await logToDatabase({
                guild_id: guildId,
                type: 'ban',
                user_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
                expires_at: null // Permanent ban
            });

            await interaction.reply({ content: `⛔ ${member.user.tag} has been banned.\n📌 Reason: ${reason}`, ephemeral: true });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
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
                    action: "Ban",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason
                });
            }

            // Also keep old database for compatibility (will be removed later)
            await sql`
                INSERT INTO mod_logs (action, target_id, moderator_id, guild_id, reason, created_at) 
                VALUES ('Ban', ${member.user.id}, ${interaction.user.id}, ${interaction.guild.id}, ${reason}, NOW())
            `;
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to ban the member.", ephemeral: true });
        }
    }
};
