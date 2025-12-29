import {
    SlashCommandBuilder,
    PermissionFlagsBits,
} from "discord.js";
import { sendLog } from "../utils/generateLog.js";

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

        if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({ content: "I don't have **Manage Messages** permission!" });
        }

        let deletedCount = 0;

        try {
            if (targetMember) {
                // === TARGETED CLEAR (specific member) ===
                const messages = await interaction.channel.messages.fetch({ limit: 100 });

                const targetMessages = messages
                    .filter(m => m.author.id === targetMember.id)
                    .first(amount);

                // Delete messages one by one (safest method for non-contiguous + old messages)
                for (const message of targetMessages) {
                    if (deletedCount >= amount) break;
                    try {
                        await message.delete();
                        deletedCount++;
                    } catch (err) {
                        // Skip messages that can't be deleted (e.g. pinned, already deleted)
                        continue;
                    }
                }
            } else {
                // === REGULAR BULK CLEAR (no target) ===
                await interaction.channel.bulkDelete(amount, true);
                deletedCount = amount;
            }

            const reply = deletedCount > 0
                ? `Successfully deleted **${deletedCount}** message(s)${targetMember ? ` from ${targetMember.user.tag}` : ""}.\nReason: ${reason}`
                : "No messages were deleted (they may be older than 14 days or already gone).";

            await interaction.editReply({ content: reply });

            // Send log
            await sendLog(interaction.guild, {
                action: "Clear Messages",
                target: targetMember?.user || "Not specified",
                moderator: interaction.user,
                reason: reason,
                extra: `${deletedCount} message(s) deleted`,
            });

        } catch (error) {
            console.error("Clear command failed:", error);
            await interaction.editReply({
                content: "An error occurred while deleting messages. Some may be too old (>14 days) or already deleted.",
            });
        }
    },
};