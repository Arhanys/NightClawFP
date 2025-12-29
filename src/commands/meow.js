import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("meow")
        .setDescription("Act as a little cat and meow!"),
    async execute(interaction) {
        const meows = ["Meow! 🐱", "Meow meow! 🐈", "Mew! 🐾", "Purr... 🐱"];
        const randomMeow = meows[Math.floor(Math.random() * meows.length)];
        await interaction.reply(randomMeow);
    }
}