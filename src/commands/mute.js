import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendLog } from "../utils/generateLog.js";

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
        
        // Check if member is kickable/mutable
        if (!member.moderatable)
            return interaction.reply({ content: "I cannot mute this member.", ephemeral: true });

        // Convert minutes to milliseconds
        const durationMs = time * 60 * 1000;

        try {
            await member.timeout(durationMs, reason);

            await interaction.reply({ content: `🔇 ${member.user.tag} has been muted for ${time} minute(s).\n📌 Reason: ${reason}`, ephemeral: true });

            // log the action
            await sendLog(interaction.guild, {
                action: "Mute",
                target: member.user,
                moderator: interaction.user,
                reason: reason,
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to mute the member.", ephemeral: true });
        }
    }
};
