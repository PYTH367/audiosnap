// ────────────────────────────────────────────────────────────
// POST /api/trim
// Same pipeline as /api/convert but requires a trim window. Kept as a
// separate, explicit endpoint (rather than an optional field on
// /convert) so the API — and the frontend's intent — is unambiguous:
// "export everything" vs. "export only this selection".
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { TrimInput } from "@/types";
import { createConversionJob } from "./convert.controller";

export async function trimController(req: Request, res: Response) {
  const conversion = await createConversionJob(req.clientId!, req.body as TrimInput);
  res.status(202).json({
    conversionId: conversion.id,
    status: conversion.status,
    estimatedBytes: conversion.estimatedBytes,
    trimStartSec: conversion.trimStartSec,
    trimEndSec: conversion.trimEndSec,
  });
}
