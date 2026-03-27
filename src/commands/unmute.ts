import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import type { Command } from '../types/index.js';

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

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.options.getMember("member") as GuildMember;
        const guildId = interaction.guild!.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member as GuildMember, guildId);
        if (!hasPerms) {
            return void interaction.reply({ content: t('unmute_no_permission', lang), ephemeral: true });
        }

        if (!member) {
            return void interaction.reply({ content: t('member_not_found', lang), ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return void interaction.reply({ content: t('unmute_not_muted', lang), ephemeral: true });
        }

        try {
            await member.timeout(null);

            await interaction.reply({ content: t('unmute_success', lang, { tag: member.user.tag }), ephemeral: true });

            const successEmbed = new EmbedBuilder()
                .setTitle(t('unmute_embed_title', lang))
                .setColor(0x00FF00)
                .addFields(
                    { name: t('field_user', lang), value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            if (settings.log_channel_id) {
                const logChannel = interaction.guild!.channels.cache.get(settings.log_channel_id);
                if (logChannel?.isTextBased()) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                await sendLog(interaction.guild!, { action: "Unmute", target: member.user, moderator: interaction.user });
            }
        } catch (error) {
            console.error(error);
            return void interaction.reply({ content: t('unmute_failed', lang), ephemeral: true });
        }
    }
} satisfies Command;
