import { Client } from "discord.js";
import type { Event } from '../types/index.js';

export default {
    name: "clientReady",
    once: true,

    execute(client: Client): void {
        console.log(`Successfully logged in as ${client.user!.tag}`);
    }
} satisfies Event;
