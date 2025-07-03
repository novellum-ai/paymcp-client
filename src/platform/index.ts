// Platform abstraction layer
export interface PlatformCrypto {
  digest: (data: Uint8Array) => Promise<Uint8Array>;
  randomUUID: () => string;
  toHex: (data: Uint8Array) => string;
}

export interface PlatformSQLite {
  openDatabaseSync: (name: string) => SQLiteDatabase;
}

export interface SQLiteDatabase {
  execAsync: (sql: string) => Promise<void>;
  prepareAsync: (sql: string) => Promise<SQLiteStatement>;
  closeAsync: () => Promise<void>;
}

export interface SQLiteStatement {
  executeAsync: <T = any>(...params: any[]) => Promise<SQLiteResult<T>>;
  finalizeAsync: () => Promise<void>;
}

export interface SQLiteResult<T> {
  getFirstAsync: () => Promise<T | null>;
}

// Platform detection
export const isReactNative = typeof global !== 'undefined' && global.navigator?.product === 'ReactNative';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// Apply URL polyfill for React Native/Expo
if (isReactNative) {
  require('react-native-url-polyfill/auto');
}

// Export platform-specific implementations
export let crypto: PlatformCrypto;
export let sqlite: PlatformSQLite;

if (isReactNative) {
  // React Native implementation
  const expoCrypto = require('expo-crypto');
  const expoSqlite = require('expo-sqlite');
  
  crypto = {
    digest: async (data: Uint8Array) => {
      const hash = await expoCrypto.digestStringAsync(
        expoCrypto.CryptoDigestAlgorithm.SHA256,
        new TextDecoder().decode(data)
      );
      return new Uint8Array(Buffer.from(hash, 'hex'));
    },
    randomUUID: () => expoCrypto.randomUUID(),
    toHex: (data: Uint8Array) => Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(''),
  };
  
  sqlite = {
    openDatabaseSync: (name: string) => expoSqlite.openDatabaseSync(name),
  };
} else {
  // Node.js implementation
  const nodeCrypto = require('crypto');
  const Database = require('better-sqlite3');
  
  crypto = {
    digest: async (data: Uint8Array) => {
      return new Uint8Array(nodeCrypto.createHash('sha256').update(data).digest());
    },
    randomUUID: () => nodeCrypto.randomUUID(),
    toHex: (data: Uint8Array) => Buffer.from(data).toString('hex'),
  };
  
  sqlite = {
    openDatabaseSync: (name: string) => {
      const db = new Database(name === ':memory:' ? ':memory:' : name);
      
      return {
        execAsync: async (sql: string) => {
          db.exec(sql);
        },
        prepareAsync: (sql: string) => {
          const stmt = db.prepare(sql);
          return Promise.resolve({
            executeAsync: async <T>(...params: any[]) => {
              // Use .all() for SELECT, .run() for others
              const isSelect = /^\s*select/i.test(sql);
              let resultRows: T[] = [];
              let runResult: any = null;
              if (isSelect) {
                resultRows = stmt.all(...params);
              } else {
                runResult = stmt.run(...params);
              }
              return {
                getFirstAsync: async () => {
                  if (isSelect) {
                    return resultRows[0] || null;
                  } else {
                    return null;
                  }
                },
                // Optionally, you could expose runResult for non-SELECTs if needed
              };
            },
            finalizeAsync: async () => {
              // better-sqlite3 statements are automatically finalized when they go out of scope
            },
          });
        },
        closeAsync: async () => {
          db.close();
        },
      };
    },
  };
} 