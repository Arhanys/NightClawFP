import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("kmk")
        .setDescription("Create a Kiss/Marry/Kill embed")
        .addStringOption(option =>
            option.setName("text")
                  .setDescription("The text/question for the KMK")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("image_url")
                  .setDescription("Image URL for the embed")
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("schedule_date")
                  .setDescription("Date to send (YYYY-MM-DD HH:MM) - leave empty for immediate")
                  .setRequired(false)
        ),

    async execute(interaction) {
        const text = interaction.options.getString("text");
        const imageUrl = interaction.options.getString("image_url");
        const scheduleDate = interaction.options.getString("schedule_date");

        // Validate image URL if provided
        if (imageUrl && !isValidUrl(imageUrl)) {
            return interaction.reply({ 
                content: "❌ Please provide a valid image URL.", 
                ephemeral: true 
            });
        }

        // Validate and parse schedule date if provided
        let scheduledTime = null;
        if (scheduleDate) {
            scheduledTime = parseScheduleDate(scheduleDate);
            if (!scheduledTime) {
                return interaction.reply({ 
                    content: "❌ Invalid date format. Use: YYYY-MM-DD HH:MM (e.g., 2024-12-29 15:30)", 
                    ephemeral: true 
                });
            }
        }

        try {
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle("💋 Kiss, Marry, Kill 💍")
                .setDescription(text)
                .setColor(0xFF69B4) // Hot pink color
                .setTimestamp();

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            if (scheduledTime) {
                embed.addFields({
                    name: "⏰ Scheduled for",
                    value: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`,
                    inline: true
                });
            }

            embed.setFooter({ text: "React with 💋 Kiss | 💍 Marry | 🔪 Kill" });

            // TODO: Save to database when ready
            // await saveKMKToDatabase({
            //     text: text,
            //     imageUrl: imageUrl,
            //     scheduledTime: scheduledTime,
            //     authorId: interaction.user.id,
            //     channelId: interaction.channel.id
            // });

            if (scheduledTime) {
                // If scheduled, just confirm the scheduling
                await interaction.reply({
                    content: `✅ KMK scheduled for <t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`,
                    ephemeral: true
                });
                
                // TODO: Implement scheduler when database is ready
                // scheduleKMK(scheduledTime, embed, interaction.channel);
            } else {
                // Send immediately
                const message = await interaction.reply({ 
                    embeds: [embed],
                    fetchReply: true 
                });

                // Add reactions
                await message.react('💋'); // Kiss
                await message.react('💍'); // Marry  
                await message.react('🔪'); // Kill
            }

        } catch (error) {
            console.error('KMK Command Error:', error);
            return interaction.reply({ 
                content: "❌ Failed to create KMK embed.", 
                ephemeral: true 
            });
        }
    }
};

// Helper function to validate URLs
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Helper function to parse schedule date
function parseScheduleDate(dateString) {
    try {
        // Expected format: YYYY-MM-DD HH:MM
        const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
        const match = dateString.match(regex);
        
        if (!match) return null;
        
        const [, year, month, day, hour, minute] = match;
        const date = new Date(year, month - 1, day, hour, minute);
        
        // Check if date is valid and in the future
        if (isNaN(date.getTime()) || date <= new Date()) {
            return null;
        }
        
        return date;
    } catch (error) {
        return null;
    }
}

// TODO: Database functions to implement later
// async function saveKMKToDatabase(kmkData) {
//     // Save KMK data to database
//     // Include: text, imageUrl, scheduledTime, authorId, channelId
// }

// function scheduleKMK(scheduledTime, embed, channel) {
//     // Schedule the KMK to be sent at the specified time
//     // This could use node-cron or similar scheduling library
// }
