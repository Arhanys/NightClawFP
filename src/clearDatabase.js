import sql from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database tables...');

    // Clear all tables (truncate preserves table structure)
    await sql`TRUNCATE TABLE kmk_posts RESTART IDENTITY CASCADE`;
    console.log('✅ KMK posts cleared');

    await sql`TRUNCATE TABLE confessions RESTART IDENTITY CASCADE`;
    console.log('✅ Confessions cleared');

    await sql`TRUNCATE TABLE mod_logs RESTART IDENTITY CASCADE`;
    console.log('✅ Moderation logs cleared');

    await sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`;
    console.log('✅ Users cleared');

    console.log('🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    await sql.end();
    process.exit();
  }
}

clearDatabase();