import { Router } from "express";
import { validate } from "@/middleware/validate.middleware";
import { historyQuerySchema, idParamSchema } from "@/types";
import {
  listHistoryController,
  deleteHistoryController,
  toggleFavoriteController,
  dashboardStatsController,
  searchHistoryController,
  listFavoritesController,
} from "@/controllers/history.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

// Order matters: static sub-paths must come before the "/:id" param route.
router.get("/history/stats", asyncHandler(dashboardStatsController));
router.get("/history/favorites", asyncHandler(listFavoritesController));
router.get("/history/searches", asyncHandler(searchHistoryController));

router.get("/history", validate(historyQuerySchema, "query"), asyncHandler(listHistoryController));
router.delete("/history/:id", validate(idParamSchema, "params"), asyncHandler(deleteHistoryController));
router.patch(
  "/history/:id/favorite",
  validate(idParamSchema, "params"),
  asyncHandler(toggleFavoriteController)
);

export default router;
