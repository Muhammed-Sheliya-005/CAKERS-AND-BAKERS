import express, { type NextFunction, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { registerStorageProxy } from "./storageProxy";

function safeHttpStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return 500;
}

export function createApp() {
  const app = express();
  // A 2.5 MiB image becomes about 3.5 MiB of base64 JSON. Keep Vercel's
  // parser below its 4.5 MB function payload limit; local/container keeps 4 MiB uploads.
  const requestBodyLimit = process.env.VERCEL ? "4mb" : "50mb";
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

  app.get("/api/health", (_req, res) =>
    res.set("Cache-Control", "no-store").json({ status: "ok" })
  );
  app.get("/api/platform/config.js", (_req, res) => {
    res
      .set("Cache-Control", "no-store")
      .type("application/javascript")
      .send(publicPlatformScript());
  });

  registerOAuthRoutes(app);
  registerStorageProxy(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
  // Unknown API paths must remain API responses; never allow a client-side SPA fallback.
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." })
  );

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (res.headersSent) return next(error);
      const status = safeHttpStatus(error);
      console.error(
        "[HTTP] Request failed:",
        error instanceof Error ? error.message : "unknown error"
      );
      if (status === 400 || status === 413) {
        return res
          .status(status)
          .json({
            error:
              status === 413
                ? "Request payload is too large."
                : "Invalid request body.",
          });
      }
      return res.status(500).json({ error: "Internal server error." });
    }
  );

  return app;
}
