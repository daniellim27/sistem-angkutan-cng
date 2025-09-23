// Load environment variables
require('dotenv').config();

console.log('🧪 Testing environment variables...\n');

console.log('Cloudinary credentials:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET);

console.log('\nAll environment variables starting with CLOUDINARY:');
Object.keys(process.env)
  .filter(key => key.startsWith('CLOUDINARY'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

console.log('\n✅ Environment variables test completed');
