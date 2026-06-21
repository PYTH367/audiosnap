import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { analyzeSchema, batchAnalyzeSchema } from "@/types";
import { analyzeController, batchAnalyzeController } from "@/controllers/analyze.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.post("/analyze", validate(analyzeSchema), asyncHandler(analyzeController));
router.post("/analyze/batch", validate(batchAnalyzeSchema), asyncHandler(batchAnalyzeController));

export default router;
