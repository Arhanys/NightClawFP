import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set slowmode on a channel")
        .addIntegerOption(option =>
            option.setName("seconds")
                  .setDescription("Slowmode delay in seconds (0 to disable)")
                  .setRequired(true)
                  .setMinValue(0)
                  .setMaxValue(21600)
        )
        .addChannelOption(option =>
            option.setName("channel")
                  .setDescription("Channel to apply slowmode to (defaults to current channel)")
                  .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const seconds = interaction.options.getInteger("seconds");
        const target = interaction.options.getChannel("channel") || interaction.channel;
        const guildId = interaction.guild.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerm = await hasModeratorRole(interaction.member, guildId);
        if (!hasPerm) {
            return interaction.reply({ content: t('slowmode_no_permission', lang), ephemeral: true });
        }

        try {
            await target.setRateLimitPerUser(seconds);

            const embed = new EmbedBuilder()
                .setColor(0x7289DA)
                .setTimestamp();

            if (seconds === 0) {
                embed.setDescription(t('slowmode_disabled', lang, { channel: target.toString() }));
            } else {
                embed.setDescription(t('slowmode_set', lang, { channel: target.toString(), seconds }));
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: t('slowmode_failed', lang), ephemeral: true });
        }
    }
};
