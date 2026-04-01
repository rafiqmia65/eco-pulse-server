import { Server } from "http";
import app from "./app";
// import { seedSuperAdmin } from "./app/utils/seed";
import { envVars } from "./app/config/env";

let server: Server;
const bootstrap = async () => {
  try {
    // await seedSuperAdmin();
    if (envVars.NODE_ENV === "development") {
      const port = process.env.PORT || 5000;

      server = app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

// SIGTERM signal handler
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Shutting down server...");

  if (server) {
    server.close(() => {
      console.log("Server closed gracefully.");
      process.exit(1);
    });
  }

  process.exit(1);
});

// SIGINT signal handler

process.on("SIGINT", () => {
  console.log("SIGINT signal received. Shutting down server...");

  if (server) {
    server.close(() => {
      console.log("Server closed gracefully.");
      process.exit(1);
    });
  }

  process.exit(1);
});

//uncaught exception handler
process.on("uncaughtException", (error) => {
  console.log("Uncaught Exception Detected... Shutting down server", error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.log("Unhandled Rejection Detected... Shutting down server", error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

//unhandled rejection handler

bootstrap();
