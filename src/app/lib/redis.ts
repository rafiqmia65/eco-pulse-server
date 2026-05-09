import { createClient, RedisClientType } from "redis";
import { envVars } from "../config/env";
import logger from "../utils/logger";

const redisClient: RedisClientType = createClient({
  url: envVars.REDIS_URL,
});

redisClient.on("error", (err) => logger.error(err, "Redis Client Error"));
redisClient.on("connect", () => logger.info("Redis Client Connected"));

// Explicitly connect (required for Node-Redis)
redisClient
  .connect()
  .catch((err) => logger.error(err, "Redis Connection Failed"));

export default redisClient;
