const bcrypt = require('bcrypt');

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password hash: ${hash}`);
  console.log(`\nRun this SQL:`);
  console.log(`INSERT INTO admin_users (id, username, password_hash, email, role, created_at, updated_at)`);
  console.log(`VALUES (gen_random_uuid(), 'admin', '${hash}', 'admin@example.com', 'admin', NOW(), NOW());`);
}

createAdmin();
