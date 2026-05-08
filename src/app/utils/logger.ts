import pino, { LoggerOptions } from "pino";
import { envVars } from "../config/env";
const pinoOptions: LoggerOptions = {
  level: envVars.NODE_ENV === "production" ? "info" : "debug",
};
// Only add the transport property if we are not in production
if (envVars.NODE_ENV !== "production") {
  pinoOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}
const logger = pino(pinoOptions);
export default logger;
