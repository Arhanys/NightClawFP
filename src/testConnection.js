import sql from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  } finally {
    await sql.end();
    process.exit();
  }
}

testConnection();