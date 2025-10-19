// Test API key loading and OpenAI connection
require('dotenv').config();

const OpenAI = require('openai');

async function testAPIKey() {
  try {
    console.log('🔍 Testing API key configuration...');
    
    // Check environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('API Key from env:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      prefix: apiKey ? apiKey.substring(0, 10) + '...' : 'Not found',
      hasNewlines: apiKey ? apiKey.includes('\n') : false,
      hasSpaces: apiKey ? apiKey.includes(' ') : false
    });
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    // Test OpenAI client initialization
    console.log('\n🤖 Testing OpenAI client...');
    const openai = new OpenAI({
      apiKey: apiKey.trim() // Remove any whitespace
    });
    
    // Test API call
    console.log('📡 Making test API call...');
    const response = await openai.models.list();
    
    console.log('✅ API call successful!');
    console.log('Available models:', response.data.slice(0, 5).map(m => m.id));
    
    // Test the specific model we use for OCR
    const gpt4oModel = response.data.find(m => m.id === 'gpt-4o');
    if (gpt4oModel) {
      console.log('✅ GPT-4o model is available for OCR');
    } else {
      console.log('❌ GPT-4o model not found');
    }
    
    console.log('\n🎉 API key is working correctly!');
    
  } catch (error) {
    console.error('❌ API key test failed:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Authentication failed - check API key format');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error - check internet connection');
    } else {
      console.error('📋 Full error:', error);
    }
  } finally {
    process.exit(0);
  }
}

testAPIKey();
