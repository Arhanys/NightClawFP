import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member from the server")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to kick")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the kick")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") || "No reason provided";

        if (!member.kickable)
            return interaction.reply({ content: "I cannot kick this member.", ephemeral: true });

        try {
            await member.kick(reason);
            await interaction.reply({ content: `👢 ${member.user.tag} has been kicked.\n📌 Reason: ${reason}`, ephemeral: true });

            // log the action
            await sendLog(interaction.guild, {
                action: "Kick",
                target: member.user,
                moderator: interaction.user,
                reason: reason
            });

            // Save to database
            await sql`
                INSERT INTO mod_logs (action, target_id, moderator_id, reason, created_at) 
                VALUES ('Kick', ${member.user.id}, ${interaction.user.id}, ${reason}, NOW())
            `;
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to kick the member.", ephemeral: true });
        }
    }
};
