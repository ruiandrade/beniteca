const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 1, role: 'A' },
  'dev-secret-change-me',
  { expiresIn: '1h' }
);

console.log('Token:', token);

// Now test it
const { exec } = require('child_process');
const cmd = `curl -s "http://localhost:3000/api/reports/1021?fromDate=2024-12-01&toDate=2024-12-31" -H "Authorization: Bearer ${token}" 2>&1`;
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('Response:');
  // Try to parse and pretty print
  try {
    const json = JSON.parse(stdout);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log(stdout.substring(0, 500));
  }
});
