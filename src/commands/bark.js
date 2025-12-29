import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("bark")
        .setDescription("Act as a little dog and bark!"),
    async execute(interaction) {
        const barks = ["Bark! 🐶", "Woof woof! 🐕", "Arf! 🐾", "Ruff... 🐕"];
        const randomBark = barks[Math.floor(Math.random() * barks.length)];
        await interaction.reply(randomBark);
    }
}