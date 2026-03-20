import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

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

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: t('kick_no_permission', lang),
                ephemeral: true
            });
        }

        if (!member.kickable)
            return interaction.reply({ content: t('kick_cannot_kick', lang), ephemeral: true });

        try {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(t('dm_kick_title', lang))
                    .setDescription(t('dm_kick_body', lang, { server: interaction.guild.name, reason }))
                    .setColor(0xFFA500)
                    .setTimestamp();
                await member.user.send({ embeds: [dmEmbed] });
            } catch {}

            await member.kick(reason);

            await logToDatabase({
                guild_id: guildId,
                action: 'kick',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
            });

            await interaction.reply({ content: t('kick_success', lang, { tag: member.user.tag, reason }), ephemeral: true });

            const successEmbed = new EmbedBuilder()
                .setTitle(t('kick_embed_title', lang))
                .setColor(0xFFA500)
                .addFields(
                    { name: t('field_user', lang), value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user.tag}`, inline: true },
                    { name: t('field_reason', lang), value: reason, inline: false }
                )
                .setTimestamp();

            if (settings.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id);
                if (logChannel) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                await sendLog(interaction.guild, {
                    action: "Kick",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: t('kick_failed', lang), ephemeral: true });
        }
    }
};
