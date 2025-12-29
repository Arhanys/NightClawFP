import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("sanction")
        .setDescription("Check a user's moderation record")
        .addUserOption(option =>
            option.setName("user")
                  .setDescription("User to check sanctions for")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("user");
        const page = 0; // Start at page 0
        
        await showSanctionPage(interaction, targetUser, page, false);
    }
};

export { showSanctionPage };

async function showSanctionPage(interaction, targetUser, page, isUpdate = false) {
    const SANCTIONS_PER_PAGE = 15;
    const offset = page * SANCTIONS_PER_PAGE;
    
    try {
        // Get total count
        const totalResult = await sql`
            SELECT COUNT(*) as total FROM mod_logs WHERE target_id = ${targetUser.id} AND guild_id = ${interaction.guild.id}
        `;
        const totalSanctions = parseInt(totalResult[0].total);
        const totalPages = Math.ceil(totalSanctions / SANCTIONS_PER_PAGE);
        
        // Get sanctions for this page
        const sanctions = await sql`
            SELECT id, action, moderator_id, reason, created_at 
            FROM mod_logs 
            WHERE target_id = ${targetUser.id} AND guild_id = ${interaction.guild.id}
            ORDER BY created_at DESC
            LIMIT ${SANCTIONS_PER_PAGE} OFFSET ${offset}
        `;

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`📋 Moderation Record`)
            .setAuthor({ 
                name: targetUser.displayName, 
                iconURL: targetUser.displayAvatarURL() 
            })
            .setColor(sanctions.length > 0 ? 0xFF6B6B : 0x51CF66)
            .setTimestamp();

        let components = [];

        if (totalSanctions === 0) {
            embed.setDescription("✅ No moderation history found. This user has a clean record!");
        } else {
            const pageInfo = totalPages > 1 ? ` (Page ${page + 1}/${totalPages})` : '';
            embed.setDescription(`**Total Sanctions:** ${totalSanctions}${pageInfo}`);
            
            // Add sanctions as numbered list
            const actionEmojis = {
                'Ban': '⛔',
                'Kick': '👢', 
                'Mute': '🔇'
            };

            let sanctionText = "";
            for (let i = 0; i < sanctions.length; i++) {
                const sanction = sanctions[i];
                const globalNumber = offset + i + 1; // Global sanction number
                const date = new Date(sanction.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                
                sanctionText += `**${globalNumber}.** ${actionEmojis[sanction.action] || '⚠️'} ${sanction.action} - ${date}\n`;
            }

            embed.addFields({
                name: "Actions",
                value: sanctionText,
                inline: false
            });

            // Create buttons
            const row1 = new ActionRowBuilder();
            
            // Previous button
            if (page > 0) {
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sanction_prev_${targetUser.id}_${page - 1}`)
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
            // View details button
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sanction_view_${targetUser.id}_${page}`)
                    .setLabel('📋 View Details')
                    .setStyle(ButtonStyle.Primary)
            );
            
            // Next button
            if (page < totalPages - 1) {
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sanction_next_${targetUser.id}_${page + 1}`)
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
            components = [row1];
        }

        if (isUpdate) {
            await interaction.update({ 
                embeds: [embed], 
                components: components
            });
        } else {
            await interaction.reply({ 
                embeds: [embed], 
                components: components,
                ephemeral: true 
            });
        }

    } catch (error) {
        console.error('Sanction Command Error:', error);
        const content = "❌ Failed to retrieve moderation record.";
        
        if (isUpdate) {
            await interaction.update({ content, embeds: [], components: [] });
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
    }
}