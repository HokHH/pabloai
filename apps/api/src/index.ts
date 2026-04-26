import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chats.js";
import { egeRouter } from "./routes/ege.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: () => "global-api-limit",
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "mindspark-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/chats", requireAuth, chatRouter);
app.use("/api/ege", requireAuth, egeRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`MindSpark API running on http://localhost:${env.PORT}`);
});
