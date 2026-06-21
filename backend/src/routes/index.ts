import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { idParamSchema } from "@/types";
import { downloadController } from "@/controllers/download.controller";
import { asyncHandler } from "@/utils/asyncHandler";

import analyzeRoutes from "./analyze.routes";
import convertRoutes from "./convert.routes";
import trimRoutes from "./trim.routes";
import historyRoutes from "./history.routes";

const router = Router();

router.use(analyzeRoutes);
router.use(convertRoutes);
router.use(trimRoutes);
router.use(historyRoutes);

router.get("/download/:id", validate(idParamSchema, "params"), asyncHandler(downloadController));

export default router;
