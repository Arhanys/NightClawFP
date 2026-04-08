import sql from '../db.js';

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: npx tsx src/clearUser.ts <discord_user_id>');
    process.exit(1);
}

async function clearUser(id: string): Promise<void> {
    console.log(`Clearing all moderation data for user ${id}...`);

    const modLogs = await sql`DELETE FROM mod_logs WHERE target_id = ${id}`;
    console.log(`✅ mod_logs: ${modLogs.count} row(s) deleted`);

    const appeals = await sql`DELETE FROM ban_appeals WHERE user_id = ${id}`;
    console.log(`✅ ban_appeals: ${appeals.count} row(s) deleted`);

    const warnings = await sql`UPDATE users SET warnings = 0 WHERE id = ${id}`;
    console.log(`✅ users: ${warnings.count} row(s) reset`);

    console.log('Done.');
}

clearUser(userId)
    .catch(err => { console.error('Error:', err); process.exit(1); })
    .finally(() => sql.end());
