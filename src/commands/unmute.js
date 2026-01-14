import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("unmute")
        .setDescription("Remove a timeout (unmute) from a member")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to unmute")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const guildId = interaction.guild.id;

        // Check if user has permission using server-specific settings
        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: '❌ You do not have permission to unmute members.',
                ephemeral: true
            });
        }

        if (!member) {
            return interaction.reply({ content: "Member not found.", ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: "This member is not muted.", ephemeral: true });
        }

        try {
            // Remove timeout
            await member.timeout(null);
            
            
            await interaction.reply({ content: `🔊 ${member.user.tag} has been unmuted.`, ephemeral: true });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔊 User Unmuted')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
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
                    action: "Unmute",
                    target: member.user,
                    moderator: interaction.user,
                });
            }

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to unmute the member.", ephemeral: true });
        }
    }
};
