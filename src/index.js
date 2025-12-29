import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits, Collection, ActivityType } from "discord.js";
import dotenv from "dotenv";
//temp
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

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
