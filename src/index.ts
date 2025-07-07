// Apply polyfills for React Native/Expo at the very beginning
// This must be done before any other imports that might use Node.js built-ins
if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  // URL polyfill for URL constructor and URLSearchParams
  require('react-native-url-polyfill/auto');
  
  // Buffer polyfill if not available
  if (typeof global !== 'undefined' && !global.Buffer) {
    global.Buffer = require('buffer').Buffer;
  }
  
  // Process polyfill if not available
  if (typeof global !== 'undefined' && !global.process) {
    global.process = require('process');
  }
}

export * from './auth.js';
export * from './customHttpTransport.js';
export * from './oAuth.js';
export * from './oAuthDb.js';
export * from './oAuthGlobalClient.js';
export * from './payMcpClient.js';
export * from './solanaPaymentMaker.js';
export * from './types.js';
