const { execSync } = require('child_process');

try {
  const res = execSync('"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe" reload -D "C:\\Program Files\\PostgreSQL\\18\\data"', { encoding: 'utf8' });
  console.log('pg_ctl reload output:', res);
} catch (e) {
  console.error('pg_ctl error:', e.message);
}

try {
  const out = execSync('psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT version();"', { encoding: 'utf8' });
  console.log('psql connected:\n', out);

  // Set password
  execSync('psql -h 127.0.0.1 -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD \'postgres\';"', { stdio: 'inherit' });
  console.log('Password set to postgres');

  // Create clustro_db
  try {
    execSync('psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE clustro_db;"', { stdio: 'inherit' });
    console.log('clustro_db created');
  } catch (err) {
    console.log('DB already exists or notice:', err.message);
  }
} catch (e) {
  console.error('psql error:', e.message);
}
