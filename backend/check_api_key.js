// Check OpenAI API Key (override system env vars to use .env file)
require('dotenv').config({ override: true });

const OpenAI = require('openai');

async function checkAPIKey() {
  console.log('🔍 Checking OpenAI API Key...\n');
  
  const rawKey = process.env.OPENAI_API_KEY || '';
  const trimmedKey = rawKey.trim();
  
  console.log('📋 Key Information:');
  console.log('  - Exists:', !!rawKey);
  console.log('  - Length:', rawKey.length);
  console.log('  - Starts with:', rawKey.substring(0, 15) + '...');
  console.log('  - Ends with:', '...' + rawKey.substring(rawKey.length - 15));
  console.log('  - Has leading/trailing spaces:', rawKey !== trimmedKey);
  console.log('  - Has newlines:', rawKey.includes('\n'));
  console.log('  - Has quotes:', rawKey.startsWith('"') || rawKey.startsWith("'"));
  console.log('');
  
  if (!trimmedKey) {
    console.log('❌ No API key found in environment variables');
    return;
  }
  
  if (rawKey !== trimmedKey) {
    console.log('⚠️  WARNING: API key has leading/trailing whitespace');
    console.log('   This has been trimmed for testing.\n');
  }
  
  console.log('🧪 Testing API key with OpenAI...\n');
  
  try {
    const openai = new OpenAI({
      apiKey: trimmedKey
    });
    
    // Try to list models (simple API call)
    console.log('📡 Making API call to list models...');
    const response = await openai.models.list();
    
    console.log('✅ SUCCESS! API key is valid and working!\n');
    console.log('📊 Available models (first 5):');
    response.data.slice(0, 5).forEach(model => {
      console.log(`   - ${model.id}`);
    });
    
    // Check for GPT-4o or GPT-5 models
    const gpt4o = response.data.find(m => m.id === 'gpt-4o' || m.id === 'gpt-4o-2024-08-06');
    const gpt5 = response.data.find(m => m.id.includes('gpt-5'));
    
    console.log('\n🔍 OCR Model Availability:');
    if (gpt5) {
      console.log('   ✅ GPT-5 models available');
    } else if (gpt4o) {
      console.log('   ✅ GPT-4o available (can be used for OCR)');
    } else {
      console.log('   ⚠️  GPT-4o not found, but other models available');
    }
    
  } catch (error) {
    console.log('❌ API key test FAILED!\n');
    
    if (error.status === 401) {
      console.log('🔑 Authentication Error (401):');
      console.log('   The API key is invalid, expired, or revoked.');
      console.log('   Possible reasons:');
      console.log('   1. Key has been revoked or deleted');
      console.log('   2. Key is incorrect or copied wrong');
      console.log('   3. Key format is invalid');
      console.log('   4. Account billing issue');
      console.log('\n   💡 Solution:');
      console.log('   1. Go to https://platform.openai.com/account/api-keys');
      console.log('   2. Create a new API key');
      console.log('   3. Copy the ENTIRE key (it starts with sk-proj- or sk-)');
      console.log('   4. Update OPENAI_API_KEY in your .env file');
      console.log('   5. Make sure there are NO spaces or quotes around the key');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Network Error:');
      console.log('   Cannot reach OpenAI servers. Check your internet connection.');
    } else {
      console.log('❌ Error:', error.message);
      console.log('   Full error:', error);
    }
  }
}

checkAPIKey().then(() => process.exit(0)).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

