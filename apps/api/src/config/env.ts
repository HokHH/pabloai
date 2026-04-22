import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  OPENAI_COMPAT_API_KEY: z.string().min(1),
  OPENAI_COMPAT_BASE_URL: z.string().url(),
  OPENAI_COMPAT_MODEL: z.string().min(1),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);
