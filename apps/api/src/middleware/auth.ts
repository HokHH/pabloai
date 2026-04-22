import createHttpError from "http-errors";
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        name: string;
      };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(createHttpError(401, "Требуется авторизация"));
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(createHttpError(401, "Сессия истекла, войдите заново"));
  }
}
