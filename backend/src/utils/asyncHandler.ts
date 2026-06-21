// ────────────────────────────────────────────────────────────
// Express doesn't catch rejected promises from async route handlers
// by default. Wrapping every controller in this helper means a single
// try/catch in the error middleware handles all of them.
// ────────────────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
