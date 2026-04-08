import sql from './db.js';

async function setupDatabase(): Promise<void> {
    try {
        console.log('Setting up database tables...');

        await sql`
            CREATE TABLE IF NOT EXISTS confessions (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                is_anonymous BOOLEAN NOT NULL,
                author_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                username TEXT,
                warnings INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id, guild_id)
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS mod_logs (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                target_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS server_settings (
                guild_id TEXT PRIMARY KEY,
                log_channel_id TEXT,
                mod_role_id TEXT,
                confession_channel_id TEXT,
                language TEXT DEFAULT 'en',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        try {
            await sql`ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS ticket_panel_channel_id TEXT`;
            console.log('✅ ticket_panel_channel_id column added to server_settings');
        } catch (error) {
            console.log('⚠️  ticket_panel_channel_id column already exists or error:', (error as Error).message);
        }

        try {
            await sql`ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'`;
            console.log('✅ Language column added to server_settings');
        } catch (error) {
            console.log('⚠️  Language column already exists or error:', (error as Error).message);
        }

        try {
            await sql`ALTER TABLE confessions ADD COLUMN IF NOT EXISTS guild_id TEXT`;
            await sql`ALTER TABLE mod_logs ADD COLUMN IF NOT EXISTS guild_id TEXT`;
            console.log('✅ Guild ID columns added to existing tables');
        } catch (error) {
            console.log('⚠️  Guild columns already exist or error:', (error as Error).message);
        }

        await sql`
            CREATE TABLE IF NOT EXISTS ban_appeals (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                appeal_guild_id TEXT NOT NULL,
                source_guild_id TEXT NOT NULL,
                appeal_reason TEXT NOT NULL,
                ban_reason TEXT,
                status TEXT DEFAULT 'open',
                reviewed_by TEXT,
                decision_reason TEXT,
                channel_id TEXT,
                message_id TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        try {
            await sql`ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS source_guild_id TEXT`;
            await sql`ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS appeal_invite_url TEXT`;
            await sql`ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS main_invite_url TEXT`;
            await sql`ALTER TABLE ban_appeals ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP`;
            console.log('✅ Appeal columns added to server_settings');
        } catch (error) {
            console.log('⚠️  Appeal columns already exist or error:', (error as Error).message);
        }

        await sql`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                channel_name TEXT,
                user_id TEXT NOT NULL,
                opened_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP,
                closed_by TEXT,
                transcript_url TEXT
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS isolated_users (
                id SERIAL PRIMARY KEY,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                isolated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(guild_id, user_id)
            )
        `;

        console.log('✅ Database tables created successfully!');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
    } finally {
        await sql.end();
        process.exit();
    }
}

setupDatabase();
