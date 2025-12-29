// src/utils/confessionHandler.js
import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    EmbedBuilder
} from "discord.js";

export async function handleConfessionButton(interaction) {
    const { customId } = interaction;

    if (customId === "confession_anonymous" || customId === "confession_public") {
        // Determine if it's anonymous or public
        const isAnonymous = customId === "confession_anonymous";
        
        // Create modal for confession
        const modal = new ModalBuilder()
            .setCustomId(`confession_modal_${isAnonymous ? 'anon' : 'public'}`)
            .setTitle(isAnonymous ? '🎭 Anonymous Confession' : '💬 Public Confession');

        const confessionInput = new TextInputBuilder()
            .setCustomId('confession_text')
            .setLabel("Your confession")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Share what's on your mind...")
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(confessionInput);
        modal.addComponents(row);

        // Show the modal
        await interaction.showModal(modal);
    }
}

export async function handleConfessionModal(interaction) {
    const { customId, fields, user, guild } = interaction;

    if (customId.startsWith('confession_modal_')) {
        const isAnonymous = customId.includes('anon');
        const confessionText = fields.getTextInputValue('confession_text');

        // Create confession embed
        const embed = new EmbedBuilder()
            .setTitle(isAnonymous ? "🎭 Anonymous Confession" : "💬 Public Confession")
            .setDescription(confessionText)
            .setColor(isAnonymous ? 0x36393F : 0x7289DA) // Dark for anon, blurple for public
            .setTimestamp();

        if (!isAnonymous) {
            embed.setAuthor({ 
                name: user.displayName, 
                iconURL: user.displayAvatarURL() 
            });
        }

        embed.setFooter({ 
            text: isAnonymous ? "Anonymous • ID: " + Date.now() : "Public Confession" 
        });

        // Send confession to the same channel
        await interaction.channel.send({ embeds: [embed] });

        // Confirm to user
        await interaction.reply({ 
            content: `✅ Your ${isAnonymous ? 'anonymous' : 'public'} confession has been posted!`,
            ephemeral: true 
        });

        // TODO: Log to moderator channel when database is ready
        // await logConfession(user, confessionText, isAnonymous, guild);
    }
}

// TODO: Database function to implement later
// async function logConfession(user, text, isAnonymous, guild) {
//     // Log confession for moderation purposes
//     // Include: userId, text, timestamp, isAnonymous, channelId
// }