import cors from "cors";
import express, { Application, Request, Response } from "express";
import { envVars } from "./app/config/env";
import indexRoutes from "./app/routes/indexRoutes";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";

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

// app.all("/api/auth/*splat", toNodeHandler(auth));

// Enable URL-encoded form data parsing
// app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
// app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

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
