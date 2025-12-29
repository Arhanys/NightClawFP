// src/events/interactionCreate.js
import { handleTicketButton, handleTicketModal } from "../utils/ticketHandler.js";
import { handleConfessionButton, handleConfessionModal } from "../utils/confessionHandler.js";
import { handleSanctionButton, handleSanctionModal } from "../utils/sanctionHandler.js";

export default {
    name: "interactionCreate",

    async execute(interaction, client) {
        try {
            // Slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction, client);
            }

            // Buttons
            else if (interaction.isButton()) {
                // Handle ticket buttons
                if (interaction.customId.startsWith('ticket_')) {
                    await handleTicketButton(interaction);
                }
                // Handle confession buttons
                else if (interaction.customId.startsWith('confession_')) {
                    await handleConfessionButton(interaction);
                }
                // Handle sanction detail buttons
                else if (interaction.customId.startsWith('sanction_')) {
                    await handleSanctionButton(interaction);
                }
            }
            // Modals
            else if (interaction.isModalSubmit()) {
                // Handle ticket modals
                if (interaction.customId.startsWith('ticket_')) {
                    await handleTicketModal(interaction);
                }
                // Handle confession modals
                else if (interaction.customId.startsWith('confession_')) {
                    await handleConfessionModal(interaction);
                }
                // Handle sanction modals
                else if (interaction.customId.startsWith('sanction_')) {
                    await handleSanctionModal(interaction);
                }
            }
        } catch (err) {
            console.error(err);

            // Safe error handling
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ An error occurred while processing this interaction.",
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: "❌ An unexpected error occurred.",
                    ephemeral: true
                });
            }
        }
    }
};
