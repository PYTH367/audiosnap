// ────────────────────────────────────────────────────────────
// Single place where every thrown/rejected error in the app ends up.
// Maps known error types to sensible HTTP codes and never leaks stack
// traces or internal paths to the client in production.
// ────────────────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";
import { InvalidUrlError } from "@/utils/urlValidator";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class UnsupportedSourceError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

// Express recognizes this as error middleware purely by its 4-argument arity.
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  let statusCode = 500;
  let message = "Something went wrong on our end. Please try again.";

  if (err instanceof InvalidUrlError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = env.NODE_ENV === "production" ? message : err.message;
  }

  logger.error("Request failed", {
    path: req.path,
    method: req.method,
    statusCode,
    error: err instanceof Error ? err.stack : String(err),
  });

  res.status(statusCode).json({ error: message });
}

// 404 fallback for unmatched routes — registered after all real routes.
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}
