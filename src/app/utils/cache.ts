import redis from "../lib/redis";
import logger from "./logger";

const setCache = async <T>(key: string, value: T, ttlInSeconds?: number) => {
  try {
    const stringValue = JSON.stringify(value);
    if (ttlInSeconds) {
      await redis.set(key, stringValue, {
        EX: ttlInSeconds,
      });
    } else {
      await redis.set(key, stringValue);
    }
  } catch (error) {
    logger.error(error, `Error setting cache for key: ${key}`);
  }
};

const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(error, `Error getting cache for key: ${key}`);
    return null;
  }
};

const deleteCache = async (key: string) => {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error(error, `Error deleting cache for key: ${key}`);
  }
};

const clearCacheByPattern = async (pattern: string) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    logger.error(error, `Error clearing cache by pattern: ${pattern}`);
  }
};

export const CacheUtils = {
  setCache,
  getCache,
  deleteCache,
  clearCacheByPattern,
};
