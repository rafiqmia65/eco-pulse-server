import { pinoHttp } from "pino-http";
import logger from "../utils/logger";
import { envVars } from "../config/env";

export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with status ${res.statusCode}`;
  },
  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
  },
  // Don't log health check or very frequent internal routes if needed
  quietReqLogger: envVars.NODE_ENV === "production",
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      // Avoid logging sensitive headers
      headers: {
        host: req.headers.host,
        "user-agent": req.headers["user-agent"],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
