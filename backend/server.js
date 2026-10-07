import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import destinationRoutes from "./routes/destinationRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import tourRoutes from "./routes/tourRoutes.js";
import departureRoutes from "./routes/departureRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ service: "VNA Dak Song Booking API" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/tours", tourRoutes);
app.use("/api/departures", departureRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
