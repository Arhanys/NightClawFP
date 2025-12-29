// src/utils/ticketHandler.js
import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder 
} from "discord.js";

export async function handleTicketButton(interaction) {
    const { customId, guild, user } = interaction;

    // "Open Ticket" button → show modal for reason
    if (customId === "ticket_open") {
        // Check if user already has a ticket
        const existing = guild.channels.cache.find(c => c.name === `ticket-${user.id}`);
        if (existing) {
            return interaction.reply({ content: "❌ You already have an open ticket!", ephemeral: true });
        }

        // Create modal
        const modal = new ModalBuilder()
            .setCustomId('ticket_reason_modal')
            .setTitle('Open a Ticket');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel("Reason for opening this ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Describe your issue or question...")
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        // Show the modal
        await interaction.showModal(modal);
    }

    // "Close Ticket" button → only admins/mods
    else if (customId === "ticket_close") {
        if (!interaction.member.permissions.has('ManageChannels')) {
            return interaction.reply({ content: "❌ You do not have permission to close this ticket.", ephemeral: true });
        }

        await interaction.reply({ content: "🗑️ Closing ticket...", ephemeral: true });
        await interaction.channel.delete();
    }
}

// Handle modal submission
export async function handleTicketModal(interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'ticket_reason_modal') return;

    const reason = interaction.fields.getTextInputValue('ticket_reason');
    const user = interaction.user;
    const guild = interaction.guild;

    // Find category
    const category = guild.channels.cache.find(c => c.name === "Support 🤝" && c.type === 4);
    if (!category) return interaction.reply({ content: "⚠ Ticket category not found!", ephemeral: true });

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`.toLowerCase(),
        type: 0, // Text channel
        parent: category.id,
        permissionOverwrites: [
            { id: guild.id, deny: ['ViewChannel', 'SendMessages'] },
            { id: user.id, allow: ['ViewChannel', 'SendMessages'], deny: ['ManageChannels'] },
            { id: process.env.MOD_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] }
        ]
    });

    // Embed for the ticket
    const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket for ${user.username}`)
        .setDescription(`Your ticket has been created. A moderator will assist you shortly.`)
        .addFields(
            { name: "👤 User", value: `${user}`, inline: true },
            { name: "📌 Reason", value: reason, inline: false }
        )
        .setColor("Purple")
        .setTimestamp();

    // Add close button
    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [closeRow] });
    await ticketChannel.send(`<@&${process.env.MOD_ROLE_ID}>`);
    await interaction.reply({ content: `✅ Your ticket has been created: ${ticketChannel}`, ephemeral: true });
}
