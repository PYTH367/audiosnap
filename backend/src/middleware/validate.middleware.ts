// ────────────────────────────────────────────────────────────
// Generic "validate this request body/query/params against a zod
// schema, or reject with 400" middleware factory. Keeps validation
// declarative at the route level instead of scattered inside controllers.
// ────────────────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

export const validate = (schema: ZodSchema, source: Source = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }

    // Replace with the parsed (and coerced/defaulted) value.
    req[source] = result.data;
    next();
  };
