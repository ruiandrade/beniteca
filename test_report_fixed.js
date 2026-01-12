const jwt = require('jsonwebtoken');
const { exec } = require('child_process');

const token = jwt.sign(
  { sub: 1, role: 'A' },
  'dev-secret-change-me',
  { expiresIn: '1h' }
);

const cmd = `curl -s "http://localhost:3000/api/reports/1021?fromDate=2024-12-01&toDate=2024-12-31" -H "Authorization: Bearer ${token}"`;
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  try {
    const json = JSON.parse(stdout);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log(stdout.substring(0, 500));
  }
});
