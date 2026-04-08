import { ChatInputCommandInteraction, Collection } from 'discord.js';

export interface Command {
    data: { name: string; toJSON(): unknown };
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface Event {
    name: string;
    once?: boolean;
    execute(...args: any[]): void | Promise<void>;
}

export interface ServerSettings {
    guild_id: string;
    log_channel_id: string | null;
    mod_role_id: string | null;
    confession_channel_id: string | null;
    language: 'en' | 'fr';
    source_guild_id: string | null;
    appeal_invite_url: string | null;
    main_invite_url: string | null;
    ticket_panel_channel_id: string | null;
    created_at?: Date;
    updated_at?: Date;
}

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
