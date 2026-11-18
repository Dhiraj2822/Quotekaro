const db = require('../config/db');

async function ensureAdmin(targetEmail) {
  const res = await db.query('SELECT id, name, email, phone_number, role, is_active FROM users WHERE email = $1', [targetEmail]);
  if (res.rows.length > 0) {
    await db.query("UPDATE users SET role = 'admin', is_active = true, is_email_verified = true, updated_at = NOW() WHERE email = $1", [targetEmail]);
    console.log(`[PROMOTED] ${targetEmail} -> role: admin`);
  } else {
    await db.query("INSERT INTO users (email, role, is_active, is_email_verified, name) VALUES ($1, 'admin', true, true, $2)", [targetEmail, targetEmail.split('@')[0]]);
    console.log(`[CREATED] ${targetEmail} -> role: admin`);
  }
}

async function main() {
  await ensureAdmin('dhirajs2228@gmail.com');
  await ensureAdmin('dhirajs102835@gmail.com');

  const allAdmins = await db.query("SELECT id, name, email, phone_number, role, is_active FROM users WHERE role = 'admin'");
  console.log('\nAll Admin Users in DB:');
  console.table(allAdmins.rows);
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
