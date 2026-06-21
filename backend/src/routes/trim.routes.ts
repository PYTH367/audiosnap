import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { trimSchema } from "@/types";
import { trimController } from "@/controllers/trim.controller";
import { waveformController } from "@/controllers/waveform.controller";
import { heavyOperationLimiter } from "@/middleware/rateLimit.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { z } from "zod";

const router = Router();

router.post("/trim", heavyOperationLimiter, validate(trimSchema), asyncHandler(trimController));

router.get(
  "/waveform",
  validate(z.object({ url: z.string().url() }), "query"),
  asyncHandler(waveformController)
);

export default router;
