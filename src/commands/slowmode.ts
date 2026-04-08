import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember, TextChannel, MessageFlags } from "discord.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import type { Command } from '../types/index.js';

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

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const seconds = interaction.options.getInteger("seconds") as number;
        const target = (interaction.options.getChannel("channel") || interaction.channel) as TextChannel;
        const guildId = interaction.guild!.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerm = await hasModeratorRole(interaction.member as GuildMember, guildId);
        if (!hasPerm) {
            return void interaction.reply({ content: t('slowmode_no_permission', lang), flags: MessageFlags.Ephemeral });
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

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: t('slowmode_failed', lang), flags: MessageFlags.Ephemeral });
        }
    }
} satisfies Command;
