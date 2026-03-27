import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import type { Command } from '../types/index.js';

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

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.options.getMember("member") as GuildMember;
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild!.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member as GuildMember, guildId);
        if (!hasPerms) {
            return void interaction.reply({ content: t('ban_no_permission', lang), ephemeral: true });
        }

        if (!member.bannable)
            return void interaction.reply({ content: t('ban_cannot_ban', lang), ephemeral: true });

        try {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(t('dm_ban_title', lang))
                    .setDescription(t('dm_ban_body', lang, { server: interaction.guild!.name, reason }))
                    .setColor(0xFF0000)
                    .setTimestamp();
                if (settings.appeal_invite_url) {
                    dmEmbed.addFields({ name: '🔓 Appeal', value: t('dm_appeal_link', lang, { invite: settings.appeal_invite_url }) });
                }
                await member.user.send({ embeds: [dmEmbed] });
            } catch {}

            await member.ban({ reason });

            await logToDatabase({
                guild_id: guildId,
                action: 'ban',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason,
            });

            await interaction.reply({ content: t('ban_success', lang, { tag: member.user.tag, reason }), ephemeral: true });

            const successEmbed = new EmbedBuilder()
                .setTitle(t('ban_embed_title', lang))
                .setColor(0xFF0000)
                .addFields(
                    { name: t('field_user', lang), value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user.tag}`, inline: true },
                    { name: t('field_reason', lang), value: reason, inline: false }
                )
                .setTimestamp();

            if (settings.log_channel_id) {
                const logChannel = interaction.guild!.channels.cache.get(settings.log_channel_id);
                if (logChannel?.isTextBased()) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                await sendLog(interaction.guild!, { action: "Ban", target: member.user, moderator: interaction.user, reason });
            }
        } catch (error) {
            console.error(error);
            return void interaction.reply({ content: t('ban_failed', lang), ephemeral: true });
        }
    }
} satisfies Command;
