import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "./utils/ApiError.js";
const app = express();
const allowedOrigins = process.env.CORS_ORIGIN.split(",");
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import

import shopOwnerRouter from "./routes/shopOwner.routes.js";

// routes declaration

app.use("/api/v1/shopOwners", shopOwnerRouter);
app.use(errorHandler);
export { app };
