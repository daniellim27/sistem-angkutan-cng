// Mobile API URL Configuration Helper
// This script helps you update the API URL for different environments

const fs = require('fs');
const path = require('path');

const ENV_TEMPLATE = `# Mobile App Environment Configuration
# Generated automatically - do not edit manually

# API URL Configuration
EXPO_PUBLIC_API_URL={API_URL}

# App Configuration
EXPO_PUBLIC_APP_NAME=Angkutan CNG System
EXPO_PUBLIC_VERSION=1.0.0
`;

function updateApiUrl(apiUrl) {
  const envPath = path.join(__dirname, '.env');
  const envContent = ENV_TEMPLATE.replace('{API_URL}', apiUrl);
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated .env file with API URL: ${apiUrl}`);
  console.log(`📁 File location: ${envPath}`);
}

function showUsage() {
  console.log('📱 Mobile API URL Configuration Helper');
  console.log('');
  console.log('Usage:');
  console.log('  node update-api-url.js <api-url>');
  console.log('');
  console.log('Examples:');
  console.log('  # For ngrok:');
  console.log('  node update-api-url.js https://abc123.ngrok.io/api');
  console.log('');
  console.log('  # For local development:');
  console.log('  node update-api-url.js http://192.168.100.27:5000/api');
  console.log('');
  console.log('  # For localhost:');
  console.log('  node update-api-url.js http://localhost:5000/api');
  console.log('');
}

// Get API URL from command line arguments
const apiUrl = process.argv[2];

if (!apiUrl) {
  showUsage();
  process.exit(1);
}

// Validate URL format
try {
  new URL(apiUrl);
} catch (error) {
  console.error('❌ Invalid URL format:', apiUrl);
  console.error('Please provide a valid URL starting with http:// or https://');
  process.exit(1);
}

updateApiUrl(apiUrl);
