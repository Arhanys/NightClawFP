import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits, Collection, ActivityType, REST, Routes } from "discord.js";
import dotenv from "dotenv";
//temp
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// Conditionally deploy commands if AUTO_DEPLOY is true
if (process.env.AUTO_DEPLOY === 'true') {
    await deployCommands();
}

// Load commands
const commandsPath = path.join(process.cwd(), "src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    client.commands.set(command.default.data.name, command.default);
}

// Load events
const eventsPath = path.join(process.cwd(), "src/events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = await import(`./events/${file}`);
    if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args, client));
    } else {
        client.on(event.default.name, (...args) => event.default.execute(...args, client));
    }
}

client.login(process.env.TOKEN);

// Function to deploy commands
async function deployCommands() {
    try {
        console.log("🚀 AUTO_DEPLOY enabled - Registering slash commands…");

        const commands = [];
        const commandsPath = path.join(process.cwd(), "src/commands");
        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

        for (const file of commandFiles) {
            const command = await import(`./commands/${file}`);
            commands.push(command.default.data.toJSON());
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log("✅ Commands registered automatically.");
    } catch (err) {
        console.error("❌ Auto-deploy failed:", err);
    }
}
