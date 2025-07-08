// Apply URL polyfill for React Native/Expo at the very beginning
// This must be done before any other imports that might use Node.js built-ins
if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  require('react-native-url-polyfill/auto');
}

export * from './auth.js';
export * from './customHttpTransport.js';
export * from './oAuth.js';
export * from './oAuthDb.js';
export * from './oAuthGlobalClient.js';
export * from './payMcpClient.js';
export * from './solanaPaymentMaker.js';
export * from './types.js';
