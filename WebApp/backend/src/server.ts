import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { request } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { isSupabaseConfigured } from "./config/supabase.js";

// Import Routes
import authRoutes from "./routes/auth.js";
import skillsRoutes from "./routes/skills.js";
import coursesRoutes from "./routes/courses.js";
import jobsRoutes from "./routes/jobs.js";
import aiRoutes from "./routes/ai.js";
import notificationRoutes from "./routes/notifications.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import analyticsRoutes from "./routes/analytics.js";
import certificateRoutes from "./routes/certificates.js";
import assessmentRoutes from "./routes/assessments.js";
import recommendationRoutes from "./routes/recommendations.js";
import recruiterRoutes from "./routes/recruiter.js";
import adminRoutes from "./routes/admin.js";
import resumeRoutes from "./routes/resume.js";
import skillRoutes from "./routes/skill.js";
import { resolveTrustProxyHops } from "./middleware/rateLimiter.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.set("trust proxy", resolveTrustProxyHops(process.env));
const PORT = process.env.PORT || 5000;

import compression from "compression";

// Middleware
app.use(compression());

const allowedOriginsSet = new Set(
  [
    ...(process.env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.trim()] : []),
  ]
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (React Native Android APK, curl, server health checks)
      if (!origin) {
        return callback(null, true);
      }

      // In local development without an explicit allowlist, permit Vite / Expo dev origins
      if (process.env.NODE_ENV !== "production" && allowedOriginsSet.size === 0) {
        return callback(null, true);
      }

      // Allow same-host localhost origin when running local production verification
      const localSelfOrigins = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];
      if (
        allowedOriginsSet.has("*") ||
        allowedOriginsSet.has(origin) ||
        (allowedOriginsSet.size === 0 && localSelfOrigins.includes(origin))
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Development Mode: Native Reverse Proxy to Vite on Port 8080
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    // Bypass proxy for API and health endpoints
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }

    const proxyReq = request(
      {
        host: "127.0.0.1",
        port: 5173,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },

      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", () => {
      res
        .status(503)
        .send(
          "Vite Development Server is starting up... Please reload in a moment.",
        );
    });

    req.pipe(proxyReq);
  });
}

// Mount REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/skill", skillRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/recruiter", recruiterRoutes);


// Health Check Endpoints
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CognifyAI Unified API", timestamp: new Date() });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CognifyAI Unified API",
    port: Number(PORT),
    network: "0.0.0.0",
    timestamp: new Date(),
  });
});

// Production Mode: Serve Frontend Build Files & Support Client-side Router
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.resolve(__dirname, "../../dist/client");
  app.use(express.static(clientBuildPath));

  // Catch-all to serve index.html for React Router compatibility (preserve JSON 404 for unknown /api routes)
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    return res.sendFile(path.resolve(clientBuildPath, "index.html"));
  });
}

// Global Error Handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Unhandled Backend Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  },
);

// Connect to Database and start listening
async function startServer() {
  if (isSupabaseConfigured()) {
    console.log("Supabase configuration detected. Validating connection...");
  } else {
    console.error(
      "ERROR: Supabase is NOT configured. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.",
    );
  }

  let currentPort = Number(PORT);

  function startListening(port: number) {
    const server = app.listen(port, "0.0.0.0", () => {
      const publicUrl = process.env.RENDER_EXTERNAL_URL || `http://0.0.0.0:${port}`;
      console.log(`CognifyAI Unified Server listening on ${publicUrl} (PORT=${port})`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(
          `Port ${port} is already in use. Retrying on port ${port + 1}...`,
        );
        startListening(port + 1);
      } else {
        console.error("Express server error:", err);
      }
    });
  }

  startListening(currentPort);
}

startServer();
