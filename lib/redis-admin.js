import Redis from 'ioredis';

let adminClient = null;

function getAdmin() {
  if (adminClient) return adminClient;

  const redisUrl = process.env.REDIS_URL ||
    `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`;

  adminClient = new Redis(redisUrl, {
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000);
    },
  });

  adminClient.on('error', (err) => {
    console.error('[redis-admin] Connection error:', err.message);
  });

  adminClient.on('connect', () => {
    console.log('[redis-admin] Connected to Redis');
  });

  return adminClient;
}

// Alias for backward compatibility with old code - FIX Attempted import error
export const getAdminRedis = getAdmin;
export const getRedisAdmin = getAdmin;

// FINAL ACL - Fix all NOPERM bugs (PONG)
export async function createTenantUser(username, password) {
  const admin = getAdmin();

  try {
    try {
      await admin.call('AUTH', 'default', process.env.REDIS_PASSWORD || '');
    } catch (err) {
      console.debug('[redis-admin] Default AUTH skipped');
    }

    const result = await admin.call(
      'ACL',
      'SETUSER',
      username,
      'on',
      `>${password}`,
      `~${username}:*`,
      '~bull:*',
      `~${username}:bull:*`,
      '~bull:forensics:*',
      '+@all',
      '-@dangerous',
      '-@admin',
      '-flushall',
      '-flushdb',
      '-acl',
      '+info',
      '+ping',
      '+echo',
      '+hello',
      '+keys',
      '+scan',
      '+dbsize',
      '+eval',
      '+evalsha'
    );

    console.log(`[redis-admin] ACL user "${username}" created`);

    try {
      await admin.call('ACL', 'SAVE');
    } catch (saveErr) {
      console.warn('[redis-admin] ACL SAVE failed (expected on managed):', saveErr.message);
    }
    
    return result;
  } catch (err) {
    console.error(`[redis-admin] Failed to create ${username}:`, err.message);
    throw new Error(`ACL setup failed for ${username}: ${err.message}`);
  }
}

export async function removeTenantUser(username) {
  const admin = getAdmin();
  try {
    await admin.call('ACL', 'DELUSER', username);
    try { await admin.call('ACL', 'SAVE'); } catch {}
    console.log(`[redis-admin] ACL user "${username}" deleted`);
    return true;
  } catch (err) {
    console.warn(`[redis-admin] Failed to delete ${username}:`, err.message);
    return false;
  }
}

export async function isAclSupported() {
  const admin = getAdmin();
  try {
    await admin.call('ACL', 'WHOAMI');
    return true;
  } catch (err) {
    return false;
  }
}

export async function listAclUsers() {
  const admin = getAdmin();
  try {
    const users = await admin.call('ACL', 'LIST');
    return Array.isArray(users) ? users : [];
  } catch (err) {
    console.error('[redis-admin] Failed to list users:', err.message);
    return [];
  }
}

export async function getAclUser(username) {
  const admin = getAdmin();
  try {
    const users = await admin.call('ACL', 'GETUSER', username);
    return Array.isArray(users) ? users : null;
  } catch (err) {
    return null;
  }
}

const redisAdmin = {
  getAdmin,
  getAdminRedis,
  getRedisAdmin,
  createTenantUser,
  removeTenantUser,
  isAclSupported,
  listAclUsers,
  getAclUser,
};

export default redisAdmin;
