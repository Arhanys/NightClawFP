// src/utils/serverSettings.js
import sql from '../db.js';

// Cache for server settings to avoid frequent DB queries
const settingsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getServerSettings(guildId) {
    // Check cache first
    const cached = settingsCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.settings;
    }

    try {
        const result = await sql`
            SELECT * FROM server_settings WHERE guild_id = ${guildId}
        `;

        const settings = result[0] || {
            guild_id: guildId,
            log_channel_id: null,
            mod_role_id: null,
            confession_channel_id: null,
            language: 'en',
            source_guild_id: null,
            appeal_invite_url: null,
            main_invite_url: null
        };

        // Cache the result
        settingsCache.set(guildId, {
            settings,
            timestamp: Date.now()
        });

        return settings;
    } catch (error) {
        console.error('Error fetching server settings:', error);
        return {
            guild_id: guildId,
            log_channel_id: null,
            mod_role_id: null,
            confession_channel_id: null,
            language: 'en',
            source_guild_id: null,
            appeal_invite_url: null,
            main_invite_url: null
        };
    }
}

export function clearServerSettingsCache(guildId) {
    if (guildId) {
        settingsCache.delete(guildId);
    } else {
        settingsCache.clear();
    }
}

export async function hasModeratorRole(member, guildId) {
    // Check if user has Administrator permission first
    if (member.permissions.has('Administrator')) {
        return true;
    }

    // Get server settings
    const settings = await getServerSettings(guildId);
    
    if (!settings.mod_role_id) {
        // No mod role configured, fallback to Discord permissions
        return member.permissions.has(['ModerateMembers', 'BanMembers', 'KickMembers'].some(perm => member.permissions.has(perm)));
    }

    // Check if user has the configured moderator role
    return member.roles.cache.has(settings.mod_role_id);
}