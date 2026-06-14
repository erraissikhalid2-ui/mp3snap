/**
 * server.ts – MP3Snap Express entry point
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

import { analyzeRouter } from "./src/routes/analyze.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ── Resolve public dir (works both from project root and from dist/) ──────────
// When running as `node dist/server.js`, __dirname = /app/dist
// When running as `tsx server.ts`,       __dirname = /app
const publicDir = existsSync(path.join(__dirname, "public", "index.html"))
  ? path.join(__dirname, "public")           // running from project root (dev)
  : path.join(__dirname, "..", "public");    // running from dist/ (production)

console.log(`[server] public dir → ${publicDir}`);
console.log(`[server] index.html exists: ${existsSync(path.join(publicDir, "index.html"))}`);

// ── Security & utility middlewares ───────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://i.ytimg.com", "https://img.youtube.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? "*", methods: ["GET", "POST"] }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", analyzeRouter);

// ── Health probe ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── Static assets ────────────────────────────────────────────────────────────
app.use(express.static(publicDir, { maxAge: "1d" }));

// SPA fallback
app.get("*", (_req, res) => {
  const indexPath = path.join(publicDir, "index.html");
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).json({
      error: "index.html not found",
      publicDir,
      dirname: __dirname,
    });
  }
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server error]", err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`🎵  MP3Snap → http://localhost:${PORT}`);
  console.log(`📁  Serving static from: ${publicDir}`);
});

export default app;
