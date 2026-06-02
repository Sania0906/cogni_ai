import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { request } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { isSupabaseConfigured } from "./config/supabase";

// Import Routes
import authRoutes from "./routes/auth";
import skillsRoutes from "./routes/skills";
import coursesRoutes from "./routes/courses";
import jobsRoutes from "./routes/jobs";
import aiRoutes from "./routes/ai";
import notificationRoutes from "./routes/notifications";
import subscriptionRoutes from "./routes/subscriptions";
import analyticsRoutes from "./routes/analytics";
import certificateRoutes from "./routes/certificates";
import assessmentRoutes from "./routes/assessments";
import recommendationRoutes from "./routes/recommendations";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
        port: 8080,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", () => {
      res.status(503).send("Vite Development Server is starting up... Please reload in a moment.");
    });

    req.pipe(proxyReq);
  });
}

// Mount REST API Routes
app.use("/api/auth", authRoutes);
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

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Production Mode: Serve Frontend Build Files & Support Client-side Router
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.resolve(__dirname, "../../dist/client");
  app.use(express.static(clientBuildPath));

  // Catch-all to serve index.html for React Router compatibility
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, "index.html"));
  });
}

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Backend Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Connect to Database and start listening
async function startServer() {
  if (isSupabaseConfigured()) {
    console.log("Supabase is configured successfully.");
  } else {
    console.warn("WARNING: Supabase is NOT configured. Running server in local mock failover mode.");
  }

  let currentPort = Number(PORT);

  function startListening(port: number) {
    const server = app.listen(port, () => {
      console.log(`CognifyAI Unified Server is running on http://localhost:${port}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is already in use. Retrying on port ${port + 1}...`);
        startListening(port + 1);
      } else {
        console.error("Express server error:", err);
      }
    });
  }

  startListening(currentPort);
}

startServer();
