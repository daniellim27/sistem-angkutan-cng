require('dotenv').config();

const axios = require('axios');

async function testAccess() {
  try {
    console.log('Testing access for driver user...');
    const loginResp = await axios.post('http://localhost:3000/api/auth/mobile/login', {
      username: 'driver',
      password: 'driver'
    });

    const token = loginResp.data.token;
    console.log('Driver token acquired');

    const resp = await axios.get('http://localhost:3000/api/gas-transactions/by-deposit-group/1', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    console.log('GET /gas-transactions/by-deposit-group/1 status:', resp.status);
    console.log('Data:', JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('Driver access test failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }

  try {
    console.log('\nTesting access for admin user...');
    const loginResp = await axios.post('http://localhost:3000/api/auth/mobile/login', {
      username: 'admin',
      password: 'awak1234'
    });

    const token = loginResp.data.token;
    console.log('Admin token acquired');

    const resp = await axios.get('http://localhost:3000/api/gas-transactions/by-deposit-group/1', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    console.log('GET /gas-transactions/by-deposit-group/1 status:', resp.status);
    console.log('Data:', JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('Admin access test failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testAccess();
