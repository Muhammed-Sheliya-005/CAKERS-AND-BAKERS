import express from "express";
import path from "node:path";
import { createApp } from "./server/_core/app";

const app = createApp();
const publicDirectory = path.resolve(process.cwd(), "public");
const appDocument = path.join(publicDirectory, "index.html");

// In a Vercel deployment public/ assets are served by Vercel's static layer.
// This middleware also makes the Express entry usable with local Node tooling.
app.use(express.static(publicDirectory, { index: false, fallthrough: true }));

// Keep this list aligned with client/public/manus-routes.json and App.tsx.
const pageRoutes = [
  /^\/$/,
  /^\/(shop|categories|today-special|cart|checkout|track-order|custom-cake|contact|account|admin)\/?$/,
  /^\/product\/[^/]+\/?$/,
  /^\/order-confirmation\/[^/]+\/?$/,
];

app.get("*", (req, res) => {
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API route not found." });
    return;
  }

  // Missing files and generated assets must never be replaced by index.html.
  if (
    path.extname(req.path) ||
    ["/assets/", "/images/", "/fonts/", "/manus-storage/"].some(prefix =>
      req.path.startsWith(prefix)
    )
  ) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  const isDeclaredPage = pageRoutes.some(route => route.test(req.path));
  res.status(isDeclaredPage ? 200 : 404).sendFile(appDocument, error => {
    if (error && !res.headersSent) {
      res.status(500).type("text/plain").send("The website build is unavailable.");
    }
  });
});

export default app;
