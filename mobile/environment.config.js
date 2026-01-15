// Environment Configuration for Mobile App
// This file contains default API configuration
// Copy this to .env file for environment-specific settings

export const ENV_CONFIG = {
  // Default API URL for local development (note the /api suffix)
  API_URL: 'https://9047cda40acf.ngrok-free.app/api',
  
  // For development with Expo Go on physical device, use your computer's IP:
  // API_URL: 'http://192.168.1.100:3000/api',
  
  // For production, replace with your deployed backend URL:
  // API_URL: 'https://your-backend-domain.com/api',
  
  // Other environment variables can be added here
  APP_NAME: 'Angkutan CNG System',
  VERSION: '1.0.0'
};

// Instructions:
// 1. Create a .env file in the mobile directory
// 2. Add: EXPO_PUBLIC_API_URL=http://localhost:3000
// 3. Update the IP address for your development environment
// 4. For production builds, use your deployed backend URL
