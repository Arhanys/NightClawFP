import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendLog } from "../utils/generateLog.js";

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

        if (!member) {
            return interaction.reply({ content: "Member not found.", ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: "This member is not muted.", ephemeral: true });
        }

        try {
            // Remove timeout
            await member.timeout(null);
            console.log("UNMUTE COMMAND TRIGGERED");
            await interaction.reply({ content: `🔊 ${member.user.tag} has been unmuted.`, ephemeral: true });

            // log the action
            await sendLog(interaction.guild, {
                action: "Unmute",
                target: member.user,
                moderator: interaction.user,
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to unmute the member.", ephemeral: true });
        }
    }
};
