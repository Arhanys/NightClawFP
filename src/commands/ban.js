import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendLog } from "../utils/generateLog.js";
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member from the server")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to ban")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for the ban")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const member = interaction.options.getMember("member");
        const reason = interaction.options.getString("reason") || "No reason provided";

        if (!member.bannable)
            return interaction.reply({ content: "I cannot ban this member.", ephemeral: true });

        try {
            await member.ban({ reason });
            await interaction.reply({ content: `⛔ ${member.user.tag} has been banned.\n📌 Reason: ${reason}`, ephemeral: true });

            // log the action
            await sendLog(interaction.guild, {
                action: "Ban",
                target: member.user,
                moderator: interaction.user,
                reason: reason
            });

            // Save to database
            await sql`
                INSERT INTO mod_logs (action, target_id, moderator_id, reason, created_at) 
                VALUES ('Ban', ${member.user.id}, ${interaction.user.id}, ${reason}, NOW())
            `;
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "Failed to ban the member.", ephemeral: true });
        }
    }
};
