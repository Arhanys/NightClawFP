import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const commands = [];
const commandsPath = path.join(process.cwd(), "src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Registering global slash commands…");

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("Global commands registered. May take up to 1 hour to appear in all servers.");
    } catch (err) {
        console.error(err);
    }
})();
