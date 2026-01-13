import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member from the server")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to kick")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the kick")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild.id;

        // Check if user has permission using server-specific settings
        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: '❌ You do not have permission to kick members.',
                ephemeral: true
            });
        }

        if (!member.kickable)
            return interaction.reply({ content: "I cannot kick this member.", ephemeral: true });

        try {
            await member.kick(reason);
            
            // Log to database
            await logToDatabase({
                guild_id: guildId,
                action: 'kick',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
            });

            await interaction.reply({ content: `👢 ${member.user.tag} has been kicked.\n📌 Reason: ${reason}`, ephemeral: true });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setColor(0xFFA500)
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
                    action: "Kick",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to kick the member.", ephemeral: true });
        }
    }
};
