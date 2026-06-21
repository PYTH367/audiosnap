import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { convertSchema, idParamSchema } from "@/types";
import { convertController, getConversionStatusController } from "@/controllers/convert.controller";
import { heavyOperationLimiter } from "@/middleware/rateLimit.middleware";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.post("/convert", heavyOperationLimiter, validate(convertSchema), asyncHandler(convertController));
router.get("/convert/:id", validate(idParamSchema, "params"), asyncHandler(getConversionStatusController));

export default router;
