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

// Platform detection - supports both Expo and bare React Native
export function getIsReactNative() {
  const nav = (typeof navigator !== 'undefined' ? navigator : (typeof global !== 'undefined' ? (global as any).navigator : undefined));
  return !!nav && nav.product === 'ReactNative';
}
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// Apply URL polyfill for React Native/Expo
if (getIsReactNative()) {
  require('react-native-url-polyfill/auto');
}

// Platform factory functions
function createReactNativeCrypto(): PlatformCrypto {
  let expoCrypto: any;
  try {
    expoCrypto = require('expo-crypto');
  } catch (error) {
    throw new Error(
      'React Native detected but expo-crypto package is required. ' +
      'Please install it: npm install expo-crypto'
    );
  }
  
  return {
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
}

function createReactNativeSQLite(): PlatformSQLite {
  let expoSqlite: any;
  try {
    expoSqlite = require('expo-sqlite');
  } catch (error) {
    throw new Error(
      'React Native detected but expo-sqlite package is required. ' +
      'Please install it: npm install expo-sqlite'
    );
  }
  
  return {
    openDatabaseSync: (name: string) => expoSqlite.openDatabaseSync(name),
  };
}

function createNodeCrypto(): PlatformCrypto {
  // Use a function that will be called only when needed
  const getCrypto = () => {
    try {
      return require('crypto');
    } catch (error) {
      throw new Error('Node.js crypto module not available');
    }
  };
  
  return {
    digest: async (data: Uint8Array) => {
      const crypto = getCrypto();
      return new Uint8Array(crypto.createHash('sha256').update(data).digest());
    },
    randomUUID: () => {
      if (typeof process !== 'undefined' && process.versions?.node) {
        const crypto = getCrypto();
        return crypto.randomUUID();
      }
      throw new Error('randomUUID not available in this environment');
    },
    toHex: (data: Uint8Array) => Buffer.from(data).toString('hex'),
  };
}

function createNodeSQLite(): PlatformSQLite {
  // Use a function that will be called only when needed
  const getBetterSqlite3 = () => {
    try {
      // Use eval to prevent bundlers from statically analyzing this require
      // This ensures better-sqlite3 is only loaded at runtime in Node.js
      return eval('require')('better-sqlite3');
    } catch (error) {
      throw new Error('better-sqlite3 not available. Please install it: npm install better-sqlite3');
    }
  };
  
  return {
    openDatabaseSync: (name: string) => {
      // Initialize database lazily
      let db: any = null;
      
      const getDb = () => {
        if (!db) {
          const Database = getBetterSqlite3();
          db = new Database(name === ':memory:' ? ':memory:' : name);
        }
        return db;
      };
      
      return {
        execAsync: async (sql: string) => {
          const database = getDb();
          database.exec(sql);
        },
        prepareAsync: (sql: string) => {
          const database = getDb();
          const stmt = database.prepare(sql);
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
          if (db) {
            db.close();
            db = null;
          }
        },
      };
    },
  };
}

// Export platform-specific implementations
export let crypto: PlatformCrypto;
export let sqlite: PlatformSQLite;

if (getIsReactNative()) {
  crypto = createReactNativeCrypto();
  sqlite = createReactNativeSQLite();
} else {
  crypto = createNodeCrypto();
  sqlite = createNodeSQLite();
} 