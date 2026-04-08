import sql from '../db.js';
import { GuildMember } from 'discord.js';
import type { ServerSettings } from '../types/index.js';

const settingsCache = new Map<string, { settings: ServerSettings; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

export async function getServerSettings(guildId: string): Promise<ServerSettings> {
    const cached = settingsCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.settings;
    }

    try {
        const result = await sql`SELECT * FROM server_settings WHERE guild_id = ${guildId}`;

        const settings: ServerSettings = (result[0] as ServerSettings) || {
            guild_id: guildId,
            log_channel_id: null,
            mod_role_id: null,
            confession_channel_id: null,
            language: 'en' as const,
            source_guild_id: null,
            appeal_invite_url: null,
            main_invite_url: null,
            ticket_panel_channel_id: null
        };

        settingsCache.set(guildId, { settings, timestamp: Date.now() });
        return settings;
    } catch (error) {
        console.error('Error fetching server settings:', error);
        return {
            guild_id: guildId,
            log_channel_id: null,
            mod_role_id: null,
            confession_channel_id: null,
            language: 'en' as const,
            source_guild_id: null,
            appeal_invite_url: null,
            main_invite_url: null,
            ticket_panel_channel_id: null
        };
    }
}

export function clearServerSettingsCache(guildId?: string): void {
    if (guildId) {
        settingsCache.delete(guildId);
    } else {
        settingsCache.clear();
    }
}

export async function hasModeratorRole(member: GuildMember, guildId: string): Promise<boolean> {
    if (member.permissions.has('Administrator')) {
        return true;
    }

    const settings = await getServerSettings(guildId);

    if (!settings.mod_role_id) {
        return (['ModerateMembers', 'BanMembers', 'KickMembers'] as const).some(perm => member.permissions.has(perm));
    }

    return member.roles.cache.has(settings.mod_role_id);
}
