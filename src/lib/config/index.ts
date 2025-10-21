/**
 * Application configuration
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://aspas-edu.site/api',
    timeout: 10000,
  },
  
  // Firebase Configuration
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  
  // App Configuration
  app: {
    name: 'APSAS Web',
    version: '1.0.0',
    description: 'APSAS Web Application',
  },
  
  // UI Configuration
  ui: {
    theme: 'light',
    primaryColor: '#1890ff',
  },
} as const;

export type Config = typeof config;
