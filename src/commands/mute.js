import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

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

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: t('mute_no_permission', lang),
                ephemeral: true
            });
        }

        if (!member.moderatable)
            return interaction.reply({ content: t('mute_cannot_mute', lang), ephemeral: true });

        const durationMs = time * 60 * 1000;
        const expiresAt = new Date(Date.now() + durationMs);

        try {
            await member.timeout(durationMs, reason);

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(t('dm_mute_title', lang))
                    .setDescription(t('dm_mute_body', lang, { server: interaction.guild.name, reason, time }))
                    .setColor(0x808080)
                    .setTimestamp();
                await member.user.send({ embeds: [dmEmbed] });
            } catch {}

            await logToDatabase({
                guild_id: guildId,
                action: 'mute',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason: reason,
            });

            await interaction.reply({ content: t('mute_success', lang, { tag: member.user.tag, time, reason }), ephemeral: true });

            const successEmbed = new EmbedBuilder()
                .setTitle(t('mute_embed_title', lang))
                .setColor(0x808080)
                .addFields(
                    { name: t('field_user', lang), value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user.tag}`, inline: true },
                    { name: t('field_duration', lang), value: t('mute_duration', lang, { time }), inline: true },
                    { name: t('field_expires', lang), value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
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
                    action: "Mute",
                    target: member.user,
                    moderator: interaction.user,
                    reason: reason,
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: t('mute_failed', lang), ephemeral: true });
        }
    }
};
