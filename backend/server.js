require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDatabase = require("./config/database");

const analysisRoutes = require("./routes/analysis.routes");
const clusterRoutes = require("./routes/cluster.routes");
const diagnosisRoutes = require("./routes/diagnosis.routes");
const reportsRoutes = require("./routes/reports.routes");
const evidenceRoutes = require("./routes/evidence.routes");

const app = express();

const PORT = process.env.PORT || 5000;

/*
 * CORS
 *
 * Allows the React/Vite frontend to communicate
 * with this backend during local development.
 *
 * Frontend:
 * http://localhost:8443
 *
 * Vite default:
 * http://localhost:5173
 */
const allowedOrigins = [
  "http://localhost:8443",
  "http://127.0.0.1:8443",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // such as Postman, curl, server-side requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked request from origin: ${origin}`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/*
 * Middleware
 */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/*
 * Health check
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI-K8sGuard backend is running"
  });
});

/*
 * API routes
 *
 * Frontend communicates with:
 *
 * GET  /api/cluster/status
 * GET  /api/cluster/pods
 * GET  /api/cluster/deployments
 * GET  /api/cluster/services
 * GET  /api/cluster/events
 * GET  /api/cluster/logs
 *
 * POST /api/analyze/yaml
 *
 * POST /api/diagnosis
 *
 * POST /api/evidence/build
 *
 * GET  /api/reports
 * GET  /api/reports/:id
 */
app.use("/api/analyze", analysisRoutes);
app.use("/api/cluster", clusterRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/reports", reportsRoutes);

/*
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl
  });
});

/*
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  /*
   * Handle CORS errors separately
   */
  if (error.message && error.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy blocked this request"
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "production"
        ? undefined
        : error.message
  });
});

/*
 * Start server
 */
const startServer = async () => {
  try {
    /*
     * Connect to MongoDB before accepting requests.
     */
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `AI-K8sGuard backend running on port ${PORT}`
      );

      console.log(
        `Health check: http://localhost:${PORT}/health`
      );

      console.log(
        `API base URL: http://localhost:${PORT}/api`
      );

      console.log(
        "Allowed frontend origins:",
        allowedOrigins.join(", ")
      );
    });
  } catch (error) {
    console.error(
      "Failed to start AI-K8sGuard backend:",
      error.message
    );

    process.exit(1);
  }
};

startServer();

module.exports = app;