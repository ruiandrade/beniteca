require('dotenv').config({ path: '.env.development' });
const jwt = require('jsonwebtoken');

// Create a token manually for testing
const token = jwt.sign(
  { id: 1, email: 'admin@beniteca.com', role: 'A' },
  'your-secret-key-beniteca', // Same as in your code
  { expiresIn: '1h' }
);

console.log('Generated token:', token);
console.log('\nTest command:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/reports/1021?fromDate=2024-12-01&toDate=2024-12-31`);
