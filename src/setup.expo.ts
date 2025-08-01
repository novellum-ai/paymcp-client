// Expo test setup - simulates React Native environment
import { jest } from "@jest/globals";

// Mock React Native globals
// jsdom provides a navigator object, so we need to override its properties
Object.defineProperty(global.navigator, "product", {
  value: "ReactNative",
  writable: true,
  configurable: true,
});

// Polyfill TextEncoder for Jest environment
if (typeof global.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Expo modules
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(async () => {}),
    prepareAsync: jest.fn(async () => ({
      executeAsync: jest.fn(async () => ({
        getFirstAsync: jest.fn(async () => ({ name: "test-name" })),
      })),
      finalizeAsync: jest.fn(async () => {}),
    })),
    closeAsync: jest.fn(async () => {}),
  })),
}));

jest.mock("expo-crypto", () => ({
  digestStringAsync: jest.fn(async (algorithm: string, data: string) => {
    // Simple mock implementation that returns a hex string
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = new Uint8Array(32); // SHA256 is 32 bytes
    // Simple hash simulation - just use the first 32 bytes of the input
    for (let i = 0; i < Math.min(32, dataBuffer.length); i++) {
      hashBuffer[i] = dataBuffer[i];
    }
    return Array.from(hashBuffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }),
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
  },
  randomUUID: jest.fn(
    () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
  ),
}));

jest.mock("react-native-url-polyfill", () => ({
  URL: global.URL,
}));

jest.mock("react-native-url-polyfill/auto", () => ({}));

// Set up test environment
process.env.NODE_ENV = "test";
