// Apply URL polyfill for React Native/Expo at the very beginning
// This must be done before any other imports that might use Node.js built-ins
if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-url-polyfill/auto");
}

export * from "./common/index.js";
export * from "./server/index.js";
export * from "./client/index.js";
