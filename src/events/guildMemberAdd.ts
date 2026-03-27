import { GuildMember, Client } from "discord.js";
import sql from '../db.js';
import type { Event } from '../types/index.js';

export default {
    name: 'guildMemberAdd',

    async execute(member: GuildMember, client: Client): Promise<void> {
        const [appeal] = await sql`
            SELECT * FROM ban_appeals
            WHERE source_guild_id = ${member.guild.id} AND user_id = ${member.user.id} AND status = 'accepted'
            ORDER BY updated_at DESC LIMIT 1
        `;

        if (!appeal) return;

        try {
            const appealGuild = await client.guilds.fetch(appeal.appeal_guild_id);
            const appealMember = await appealGuild.members.fetch(member.user.id).catch(() => null);
            if (appealMember) {
                await appealMember.kick('Rejoined main server after accepted appeal');
            }
        } catch {
            // Appeal guild inaccessible or user already left
        }
    }
} satisfies Event;
