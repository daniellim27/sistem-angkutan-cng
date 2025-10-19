// Test API key with raw HTTP request (like curl)
require('dotenv').config();

const https = require('https');

async function testAPIKeyRaw() {
  try {
    console.log('🔍 Testing API key with raw HTTP request...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('API Key:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      prefix: apiKey ? apiKey.substring(0, 15) + '...' : 'Not found'
    });
    
    // Test with raw HTTPS request (same as curl)
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log('📡 Making raw HTTPS request...');
    
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ Raw HTTP request successful!');
          console.log(`Found ${response.data.length} models`);
          
          const gpt4o = response.data.find(m => m.id === 'gpt-4o');
          console.log('GPT-4o available:', !!gpt4o);
          
          // Now test the OpenAI client with exact same key
          testOpenAIClient(apiKey);
        } else {
          console.log('❌ Raw HTTP request failed');
          console.log('Response:', data);
          process.exit(1);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      process.exit(1);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testOpenAIClient(apiKey) {
  try {
    console.log('\n🤖 Testing OpenAI client with same key...');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    const response = await openai.models.list();
    console.log('✅ OpenAI client also works!');
    console.log(`Client found ${response.data.length} models`);
    
  } catch (error) {
    console.error('❌ OpenAI client failed:', error.message);
    
    // Try with trimmed key
    console.log('\n🔧 Trying with trimmed key...');
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: apiKey.trim()
      });
      
      const response = await openai.models.list();
      console.log('✅ OpenAI client works with trimmed key!');
      
    } catch (trimError) {
      console.error('❌ Even trimmed key failed:', trimError.message);
    }
  } finally {
    process.exit(0);
  }
}

testAPIKeyRaw();
