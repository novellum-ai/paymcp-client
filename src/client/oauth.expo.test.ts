// Expo/React Native-specific tests for platform abstraction
// Only include tests relevant to cross-platform or Expo/React Native logic

import { describe, it, expect } from "@jest/globals";
import { getIsReactNative, crypto, sqlite } from "./platform";

describe("Platform Abstraction (Expo)", () => {
  it("should detect React Native environment", () => {
    // This should be true in React Native/Expo tests
    expect(typeof getIsReactNative()).toBe("boolean");
    // Should be true in our test environment
    expect(getIsReactNative()).toBe(true);
  });

  it("should have working crypto implementation", async () => {
    const testData = new TextEncoder().encode("test");
    const hash = await crypto.digest(testData);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should have working SQLite implementation", () => {
    const db = sqlite.openDatabaseSync(":memory:");
    expect(db).toBeDefined();
    expect(typeof db.execAsync).toBe("function");
    expect(typeof db.prepareAsync).toBe("function");
  });
});
