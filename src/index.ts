import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import type { Command, Event } from './types/index.js';

dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection<string, Command>();

// Conditionally deploy commands if AUTO_DEPLOY is true
if (process.env.AUTO_DEPLOY === 'true') {
    await deployCommands();
}

// Load commands
const commandsPath = path.join(process.cwd(), "src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`) as { default: Command };
    client.commands.set(command.default.data.name, command.default);
}

// Load events
const eventsPath = path.join(process.cwd(), "src/events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of eventFiles) {
    const event = await import(`./events/${file}`) as { default: Event };
    if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args, client));
    } else {
        client.on(event.default.name, (...args) => event.default.execute(...args, client));
    }
}

client.login(process.env.TOKEN);

async function deployCommands(): Promise<void> {
    try {
        console.log("🚀 AUTO_DEPLOY enabled - Registering slash commands…");

        const commands: unknown[] = [];
        const commandsPath = path.join(process.cwd(), "src/commands");
        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js") || f.endsWith(".ts"));

        for (const file of commandFiles) {
            const command = await import(`./commands/${file}`) as { default: Command };
            commands.push(command.default.data.toJSON());
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN as string);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID as string),
            { body: commands }
        );

        console.log("✅ Global commands registered automatically.");
    } catch (err) {
        console.error("❌ Auto-deploy failed:", err);
    }
}
