import type { NextFunction, Request, Response } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Маршрут не найден" });
}

export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return;
  }

  const status = error.status || 500;
  const message = error.message || "Внутренняя ошибка сервера";

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
}
