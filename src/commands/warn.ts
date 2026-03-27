import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { logToDatabase } from '../utils/sanctionHandler.js';
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import sql from '../db.js';
import type { Command } from '../types/index.js';

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

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.options.getMember("member") as GuildMember;
        const reason = interaction.options.getString("reason") || "No reason provided";
        const guildId = interaction.guild!.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member as GuildMember, guildId);
        if (!hasPerms) {
            return void interaction.reply({ content: t('warn_no_permission', lang), ephemeral: true });
        }

        if (!member) {
            return void interaction.reply({ content: t('member_not_found', lang), ephemeral: true });
        }

        try {
            await logToDatabase({
                guild_id: guildId,
                action: 'warn',
                target_id: member.user.id,
                moderator_id: interaction.user.id,
                reason,
            });

            const existingUser = await sql`
                SELECT warnings FROM users WHERE id = ${member.user.id} AND guild_id = ${guildId}
            `;

            if (existingUser.length > 0) {
                await sql`
                    UPDATE users
                    SET warnings = warnings + 1, username = ${member.user.username}
                    WHERE id = ${member.user.id} AND guild_id = ${guildId}
                `;
            } else {
                await sql`
                    INSERT INTO users (id, guild_id, username, warnings, created_at)
                    VALUES (${member.user.id}, ${guildId}, ${member.user.username}, 1, NOW())
                `;
            }

            const [userRecord] = await sql`
                SELECT warnings FROM users WHERE id = ${member.user.id} AND guild_id = ${guildId}
            `;
            const warningCount: number = userRecord?.warnings || 0;

            let replyContent = t('warn_success', lang, { tag: member.user.tag, reason, count: warningCount });

            if (warningCount >= 3) {
                replyContent += t('warn_threshold', lang);
            }

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(t('dm_warn_title', lang))
                    .setDescription(t('dm_warn_body', lang, { server: interaction.guild!.name, reason, count: warningCount }))
                    .setColor(0xFFFF00)
                    .setTimestamp();
                await member.user.send({ embeds: [dmEmbed] });
            } catch {}

            await interaction.reply({ content: replyContent, ephemeral: true });

            const successEmbed = new EmbedBuilder()
                .setTitle(t('warn_embed_title', lang))
                .setColor(0xFFFF00)
                .addFields(
                    { name: t('field_user', lang), value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user.tag}`, inline: true },
                    { name: t('field_total_warnings', lang), value: warningCount.toString(), inline: true },
                    { name: t('field_reason', lang), value: reason, inline: false }
                )
                .setTimestamp();

            if (settings.log_channel_id) {
                const logChannel = interaction.guild!.channels.cache.get(settings.log_channel_id);
                if (logChannel?.isTextBased()) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                await sendLog(interaction.guild!, { action: "Warn", target: member.user, moderator: interaction.user, reason });
            }
        } catch (error) {
            console.error(error);
            return void interaction.reply({ content: t('warn_failed', lang), ephemeral: true });
        }
    }
} satisfies Command;
