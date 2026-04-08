import { Interaction, Client, MessageFlags } from "discord.js";
import { handleTicketButton, handleTicketModal } from "../utils/ticketHandler.js";
import { handleConfessionButton, handleConfessionModal } from "../utils/confessionHandler.js";
import { handleSanctionButton, handleSanctionModal } from "../utils/sanctionHandler.js";
import { handleAppealButton, handleAppealModal } from "../utils/banAppealHandler.js";
import type { Event } from '../types/index.js';

export default {
    name: "interactionCreate",

    async execute(interaction: Interaction, client: Client): Promise<void> {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction);
            } else if (interaction.isButton()) {
                if (interaction.customId.startsWith('ticket_')) {
                    await handleTicketButton(interaction);
                } else if (interaction.customId.startsWith('confession_')) {
                    await handleConfessionButton(interaction);
                } else if (interaction.customId.startsWith('sanction_')) {
                    await handleSanctionButton(interaction);
                } else if (interaction.customId.startsWith('appeal_')) {
                    await handleAppealButton(interaction);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('ticket_')) {
                    await handleTicketModal(interaction);
                } else if (interaction.customId.startsWith('confession_')) {
                    await handleConfessionModal(interaction);
                } else if (interaction.customId.startsWith('sanction_')) {
                    await handleSanctionModal(interaction);
                } else if (interaction.customId.startsWith('appeal_')) {
                    await handleAppealModal(interaction);
                }
            }
        } catch (err) {
            console.error(err);

            if (!interaction.isRepliable()) return;

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ An error occurred while processing this interaction.", flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ content: "❌ An unexpected error occurred.", flags: MessageFlags.Ephemeral });
            }
        }
    }
} satisfies Event;
