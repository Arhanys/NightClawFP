import sql from './db.js';

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');

    // Create KMK posts table
    await sql`
      CREATE TABLE IF NOT EXISTS kmk_posts (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_url_2 TEXT NOT NULL,
        image_url_3 TEXT NOT NULL,
        scheduled_time TIMESTAMP,
        author_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add new columns to existing kmk_posts table if they don't exist
    try {
      await sql`ALTER TABLE kmk_posts ADD COLUMN IF NOT EXISTS image_url_2 TEXT`;
      await sql`ALTER TABLE kmk_posts ADD COLUMN IF NOT EXISTS image_url_3 TEXT`;
      await sql`ALTER TABLE kmk_posts ADD COLUMN IF NOT EXISTS guild_id TEXT`;
      console.log('✅ KMK table columns updated');
    } catch (error) {
      console.log('⚠️  KMK table already up to date or error:', error.message);
    }

    // Update existing records with NULL values to have placeholder URLs
    try {
      await sql`
        UPDATE kmk_posts 
        SET image_url_2 = COALESCE(image_url_2, image_url),
            image_url_3 = COALESCE(image_url_3, image_url)
        WHERE image_url_2 IS NULL OR image_url_3 IS NULL
      `;
      console.log('✅ Existing KMK records migrated');
    } catch (error) {
      console.log('⚠️  Migration not needed or error:', error.message);
    }

    // Create confessions table
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

    // Create users table for moderation (per-guild user data)
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

    // Create moderation logs table
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

    // Create server settings table
    await sql`
      CREATE TABLE IF NOT EXISTS server_settings (
        guild_id TEXT PRIMARY KEY,
        log_channel_id TEXT,
        mod_role_id TEXT,
        confession_channel_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add guild_id to existing tables if they don't have it
    try {
      await sql`ALTER TABLE confessions ADD COLUMN IF NOT EXISTS guild_id TEXT`;
      await sql`ALTER TABLE mod_logs ADD COLUMN IF NOT EXISTS guild_id TEXT`;
      console.log('✅ Guild ID columns added to existing tables');
    } catch (error) {
      console.log('⚠️  Guild columns already exist or error:', error.message);
    }

    console.log('✅ Database tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await sql.end();
    process.exit();
  }
}

setupDatabase();