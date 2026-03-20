import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

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

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerms) {
            return interaction.reply({
                content: t('unmute_no_permission', lang),
                ephemeral: true
            });
        }

        if (!member) {
            return interaction.reply({ content: t('member_not_found', lang), ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: t('unmute_not_muted', lang), ephemeral: true });
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
                const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id);
                if (logChannel) {
                    await logChannel.send({ embeds: [successEmbed] });
                }
            } else {
                await sendLog(interaction.guild, {
                    action: "Unmute",
                    target: member.user,
                    moderator: interaction.user,
                });
            }

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: t('unmute_failed', lang), ephemeral: true });
        }
    }
};
