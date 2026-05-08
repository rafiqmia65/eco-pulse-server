import cors from "cors";
import express, { Application, Request, Response } from "express";
import { envVars } from "./app/config/env";
import indexRoutes from "./app/routes/indexRoutes";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import cookieParser from "cookie-parser";
import { PaymentController } from "./app/modules/payment/payment.controller";
import { globalRateLimiter } from "./app/middlewares/rateLimiter";

import { requestLogger } from "./app/middlewares/requestLogger";

const app: Application = express();

app.use(
  cors({
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookEvent,
);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting middleware
app.use(globalRateLimiter);

// Apply request logging middleware
app.use(requestLogger);

app.use("/api/v1", indexRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "Eco Pulse Application API is working",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
