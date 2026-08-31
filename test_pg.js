const { execSync } = require('child_process');
const passwords = ['postgres', 'admin', 'root', 'password', '123456', '1234', 'clustro', 'Pratham', 'pratham', ''];

for (const p of passwords) {
  try {
    const out = execSync('psql -h localhost -U postgres -d postgres -c "SELECT 1;"', {
      env: { ...process.env, PGPASSWORD: p },
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 3000
    });
    console.log('SUCCESS with password:', JSON.stringify(p));
    break;
  } catch (e) {
    console.log('Failed for password:', JSON.stringify(p), e.message.trim());
  }
}
