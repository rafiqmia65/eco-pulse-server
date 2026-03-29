import { toNodeHandler } from "better-auth/node";
// import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { auth } from "./app/lib/auth";

const app: Application = express();



// app.use(
//   cors({
//     origin: [
//       envVars.FRONTEND_URL,
//       envVars.BETTER_AUTH_URL,
//       "http://localhost:3000",
//       "http://localhost:5000",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// );

// app.use("/api/auth", toNodeHandler(auth));
app.all("/api/auth/*", toNodeHandler(auth));

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
// app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// app.use("/api/v1", indexRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "Eco Pulse Application API is working",
  });
});

export default app;
