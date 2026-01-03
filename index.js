import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import tokensRoutes from "./routes/tokens.routes.js";
import {
  initializeTokenEventListeners,
  closeEventListeners,
} from "./wss_controllers/allowedTokenEvents.js";
import {
  initializePoolEventListeners,
  closePoolEventListeners,
} from "./wss_controllers/poolEvents.js";
import {
  initializeLoanEventListeners,
  closeLoanEventListeners,
} from "./wss_controllers/loanEvents.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware - allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ofpl_db";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    // Initialize WebSocket event listeners after MongoDB connection
    // This won't crash the app if it fails
    try {
      initializeTokenEventListeners();
      initializePoolEventListeners();
      initializeLoanEventListeners();
    } catch (error) {
      console.error(
        "⚠️  Failed to initialize event listeners, but server will continue:",
        error.message
      );
    }
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  });

// Connection event handlers
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "OFPL Backend API is running",
    status: "success",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Tokens routes
app.use("/tokens", tokensRoutes);

// Health check route
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle unhandled promise rejections (like WebSocket errors)
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - allow server to continue running
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("⚠️  Uncaught Exception:", error);
  // Don't exit - allow server to continue running
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Shutting down gracefully...");
  await closeEventListeners();
  await closePoolEventListeners();
  await closeLoanEventListeners();
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
