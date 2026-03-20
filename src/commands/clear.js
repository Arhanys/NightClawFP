import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import { getServerSettings } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete messages from the channel")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete (1-100)")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for clearing messages")
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("Only delete messages from this member")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger("amount");
        const targetMember = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") ?? "No reason provided";

        const settings = await getServerSettings(interaction.guild.id);
        const lang = settings.language || 'en';

        if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({ content: t('clear_no_permission', lang) });
        }

        let deletedCount = 0;

        try {
            if (targetMember) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const targetMessages = messages
                    .filter(m => m.author.id === targetMember.id)
                    .first(amount);

                for (const message of targetMessages) {
                    if (deletedCount >= amount) break;
                    try {
                        await message.delete();
                        deletedCount++;
                    } catch (err) {
                        continue;
                    }
                }
            } else {
                await interaction.channel.bulkDelete(amount, true);
                deletedCount = amount;
            }

            const targetStr = targetMember ? t('clear_success_target', lang, { tag: targetMember.user.tag }) : '';
            const reply = deletedCount > 0
                ? t('clear_success', lang, { count: deletedCount, target: targetStr, reason })
                : t('clear_no_messages', lang);

            await interaction.editReply({ content: reply });

            await sendLog(interaction.guild, {
                action: "Clear Messages",
                target: targetMember?.user || "Not specified",
                moderator: interaction.user,
                reason: reason,
                extra: `${deletedCount} message(s) deleted`,
            });

        } catch (error) {
            console.error("Clear command failed:", error);
            await interaction.editReply({ content: t('clear_failed', lang) });
        }
    },
};
