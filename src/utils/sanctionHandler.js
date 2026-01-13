// src/utils/sanctionHandler.js
import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import sql from '../db.js';

export async function logToDatabase({ guild_id, action, target_id, moderator_id, reason }) {
    try {
        await sql`
            INSERT INTO mod_logs (guild_id, action, target_id, moderator_id, reason, created_at) 
            VALUES (${guild_id}, ${action}, ${target_id}, ${moderator_id}, ${reason}, NOW())
        `;
    } catch (error) {
        console.error('Error logging to database:', error);
    }
}

export async function handleSanctionButton(interaction) {
    const { customId } = interaction;

    if (customId.startsWith('sanction_view_')) {
        const parts = customId.replace('sanction_view_', '').split('_');
        const userId = parts[0];
        const page = parseInt(parts[1]) || 0;
        
        // Create modal for sanction number input
        const modal = new ModalBuilder()
            .setCustomId(`sanction_modal_${userId}_${page}`)
            .setTitle('View Sanction Details');

        const sanctionInput = new TextInputBuilder()
            .setCustomId('sanction_number')
            .setLabel("Sanction Number")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter number (e.g., 1, 2, 3...)")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(4);

        const row = new ActionRowBuilder().addComponents(sanctionInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
    
    // Handle pagination buttons
    else if (customId.startsWith('sanction_prev_') || customId.startsWith('sanction_next_')) {
        const parts = customId.split('_');
        const action = parts[1]; // 'prev' or 'next'
        const userId = parts[2];
        const newPage = parseInt(parts[3]);
        
        // Get user object
        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return interaction.reply({
                content: "❌ User not found.",
                ephemeral: true
            });
        }
        
        // Import the showSanctionPage function from the command file
        const { showSanctionPage } = await import('../commands/sanction.js');
        await showSanctionPage(interaction, targetUser, newPage, true);
    }
}

export async function handleSanctionModal(interaction) {
    const { customId, fields } = interaction;

    if (customId.startsWith('sanction_modal_')) {
        const parts = customId.replace('sanction_modal_', '').split('_');
        const userId = parts[0];
        const page = parseInt(parts[1]) || 0;
        const sanctionNumber = parseInt(fields.getTextInputValue('sanction_number'));
        
        if (isNaN(sanctionNumber) || sanctionNumber < 1) {
            return interaction.reply({
                content: "❌ Please enter a valid sanction number (1, 2, 3...).",
                ephemeral: true
            });
        }

        try {
            // Get total count first
            const totalResult = await sql`
                SELECT COUNT(*) as total FROM mod_logs WHERE target_id = ${userId} AND guild_id = ${interaction.guild.id}
            `;
            const totalSanctions = parseInt(totalResult[0].total);

            if (sanctionNumber > totalSanctions) {
                return interaction.reply({
                    content: `❌ Sanction number ${sanctionNumber} not found. User has ${totalSanctions} total sanctions.`,
                    ephemeral: true
                });
            }

            // Get the specific sanction by global position
            const sanction = await sql`
                SELECT id, action, moderator_id, reason, created_at, target_id
                FROM mod_logs 
                WHERE target_id = ${userId} AND guild_id = ${interaction.guild.id}
                ORDER BY created_at DESC
                LIMIT 1 OFFSET ${sanctionNumber - 1}
            `;

            if (sanction.length === 0) {
                return interaction.reply({
                    content: `❌ Sanction number ${sanctionNumber} not found.`,
                    ephemeral: true
                });
            }

            const sanctionData = sanction[0];
            
            // Get moderator and target user info
            const moderator = await interaction.client.users.fetch(sanctionData.moderator_id).catch(() => null);
            const targetUser = await interaction.client.users.fetch(sanctionData.target_id).catch(() => null);
            
            const moderatorName = moderator ? moderator.displayName : 'Unknown Moderator';
            const targetName = targetUser ? targetUser.displayName : 'Unknown User';
            
            const actionEmojis = {
                'Ban': '⛔',
                'Kick': '👢',
                'Mute': '🔇'
            };

            // Create detailed embed
            const embed = new EmbedBuilder()
                .setTitle(`${actionEmojis[sanctionData.action] || '⚠️'} Sanction #${sanctionNumber} Details`)
                .setColor(0xFF6B6B)
                .addFields(
                    { name: "Target", value: targetName, inline: true },
                    { name: "Moderator", value: moderatorName, inline: true },
                    { name: "Action", value: sanctionData.action, inline: true },
                    { name: "Date", value: `<t:${Math.floor(new Date(sanctionData.created_at).getTime() / 1000)}:F>`, inline: false },
                    { name: "Reason", value: sanctionData.reason || 'No reason provided', inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Sanction Detail Error:', error);
            await interaction.reply({
                content: "❌ Failed to load sanction details.",
                ephemeral: true
            });
        }
    }
}