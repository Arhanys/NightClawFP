import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import type { Command } from '../types/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get help and visit the official NightClaw dashboard"),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle("NightClaw — Help & Dashboard")
            .setDescription(
                "Need help setting up the bot or managing your server?\n\n" +
                "Visit the **official website** for documentation, guides, and your server's online dashboard."
            )
            .setColor(0x7289DA)
            .addFields(
                { name: "Commands", value: "Use `/setup` to configure the bot for your server.", inline: false },
                { name: "Features", value: "Moderation • Tickets • Confessions • Ban Appeals", inline: false }
            )
            .setFooter({ text: "nightclaw.dev" })
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel("Open Dashboard")
                .setURL("https://nightclaw.dev")
                .setStyle(ButtonStyle.Link)
        );

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
} satisfies Command;
