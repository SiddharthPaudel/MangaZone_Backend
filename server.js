import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/authRoutes.js";
import mangaRoutes from "./routes/mangaRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js"

// Config
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to DB
connectDB();

// Static folder for images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/manga", mangaRoutes);
app.use('/api/payment', paymentRoutes);
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
