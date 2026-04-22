import { Router } from "express";
import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  attachRefreshCookie,
  clearRefreshCookie,
  createRefreshToken,
  getRefreshTokenExpiry,
  refreshCookieName,
  signAccessToken,
} from "../lib/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

    if (existing) {
      throw createHttpError(409, "Пользователь с таким email уже существует");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase(),
        passwordHash,
      },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, name: user.name });
    const refreshToken = createRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    await prisma.refreshToken.create({
      data: { token: refreshToken, expiresAt, userId: user.id },
    });

    attachRefreshCookie(res, refreshToken, expiresAt);

    res.status(201).json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

    if (!user) {
      throw createHttpError(401, "Неверный email или пароль");
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw createHttpError(401, "Неверный email или пароль");
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, name: user.name });
    const refreshToken = createRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    await prisma.refreshToken.create({
      data: { token: refreshToken, expiresAt, userId: user.id },
    });

    attachRefreshCookie(res, refreshToken, expiresAt);

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[refreshCookieName];
    if (!token) {
      throw createHttpError(401, "Нет refresh-сессии");
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw createHttpError(401, "Refresh-сессия истекла");
    }

    const accessToken = signAccessToken({
      userId: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
    });

    res.json({
      accessToken,
      user: {
        id: stored.user.id,
        name: stored.user.name,
        email: stored.user.email,
        plan: stored.user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[refreshCookieName];
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
