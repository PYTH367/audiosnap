// ────────────────────────────────────────────────────────────
// GET    /api/history            — list (optionally filtered by ?search=)
// DELETE /api/history/:id        — remove a conversion + its history entry
// PATCH  /api/history/:id/favorite — toggle favorite flag
// GET    /api/history/stats      — dashboard statistics
// GET    /api/history/searches   — recent pasted URLs (search history)
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import {
  listHistory,
  deleteConversion,
  toggleFavorite,
  getDashboardStats,
  listSearchHistory,
  listFavorites,
} from "@/services/history.service";
import { NotFoundError } from "@/middleware/error.middleware";

export async function listHistoryController(req: Request, res: Response) {
  const { search } = req.query as { search?: string };
  const history = await listHistory(req.clientId!, search);
  res.json({ history });
}

export async function listFavoritesController(req: Request, res: Response) {
  res.json({ favorites: await listFavorites(req.clientId!) });
}

export async function deleteHistoryController(req: Request, res: Response) {
  const { id } = req.params;
  const result = await deleteConversion(id, req.clientId!);
  if (result.count === 0) throw new NotFoundError("Conversion not found.");
  res.status(204).send();
}

export async function toggleFavoriteController(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await toggleFavorite(id, req.clientId!);
  res.json(updated);
}

export async function dashboardStatsController(req: Request, res: Response) {
  res.json(await getDashboardStats(req.clientId!));
}

export async function searchHistoryController(req: Request, res: Response) {
  res.json({ searches: await listSearchHistory(req.clientId!) });
}
