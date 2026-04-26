import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { Response } from "express";
import { env } from "../config/env.js";

const ACCESS_TOKEN_TTL = "7d";
const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_COOKIE_NAME = "mindspark_refresh";

export type AuthPayload = {
  userId: string;
  email: string;
  name: string;
};

export function signAccessToken(payload: AuthPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function attachRefreshCookie(res: Response, token: string, expires: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    secure: env.COOKIE_SECURE,
    expires,
    path: "/api/auth",
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    secure: env.COOKIE_SECURE,
    path: "/api/auth",
  });
}

export const refreshCookieName = REFRESH_COOKIE_NAME;
