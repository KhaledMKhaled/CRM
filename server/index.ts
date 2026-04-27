import express from "express";
import session from "express-session";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { loadUser } from "./middleware/auth";

import authRoutes from "./routes/auth";
import prospectRoutes from "./routes/prospects";
import dealRoutes from "./routes/deals";
import activityRoutes from "./routes/activities";
import taskRoutes from "./routes/tasks";
import campaignRoutes from "./routes/campaigns";
import metaRoutes from "./routes/meta";
import analyticsRoutes from "./routes/analytics";
import settingsRoutes from "./routes/settings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error("SESSION_SECRET must be set to a strong value (>= 32 chars) in production");
}

const app = express();
if (isProd) app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const PgStore = connectPgSimple(session);
app.use(
  session({
    store: new PgStore({ pool, tableName: "session", createTableIfMissing: true }),
    name: "mofawtar.sid",
    secret: process.env.SESSION_SECRET || "mofawtar-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
      sameSite: "lax",
      secure: isProd,
    },
  })
);

app.use(loadUser);

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/prospects", prospectRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);

// In production: serve built client
if (isProd) {
  const distDir = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const PORT = isProd ? parseInt(process.env.PORT || "5000") : 3001;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`[server] ${isProd ? "PROD" : "DEV"} listening on http://${HOST}:${PORT}`);
});
