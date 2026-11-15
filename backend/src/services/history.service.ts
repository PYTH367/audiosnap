// ────────────────────────────────────────────────────────────
// All Prisma queries related to a client's history/dashboard live here
// so the controller stays thin and the query shapes are reusable
// (e.g. the same "withVideo" select powers both /history and the
// dashboard stats endpoint).
// ────────────────────────────────────────────────────────────
import { prisma } from "@/config/db";
import type { AudioFormat } from "@prisma/client";

const conversionWithVideo = { include: { video: true } } as const;

export async function listHistory(clientId: string, search?: string) {
  return prisma.conversion.findMany({
    where: {
      clientId,
      ...(search
        ? { video: { title: { contains: search, mode: "insensitive" as const } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    ...conversionWithVideo,
  });
}

export async function listFavorites(clientId: string) {
  return prisma.conversion.findMany({
    where: { clientId, isFavorite: true },
    orderBy: { createdAt: "desc" },
    ...conversionWithVideo,
  });
}

export async function toggleFavorite(conversionId: string, clientId: string) {
  const existing = await prisma.conversion.findFirstOrThrow({ where: { id: conversionId, clientId } });
  return prisma.conversion.update({
    where: { id: conversionId },
    data: { isFavorite: !existing.isFavorite },
    include: { video: true },
  });
}

export async function deleteConversion(conversionId: string, clientId: string) {
  return prisma.conversion.deleteMany({ where: { id: conversionId, clientId } });
}

export async function getDashboardStats(clientId: string) {
  const [totalConversions, completed, failed, favorites, formatBreakdown] = await Promise.all([
    prisma.conversion.count({ where: { clientId } }),
    prisma.conversion.count({ where: { clientId, status: "COMPLETED" } }),
    prisma.conversion.count({ where: { clientId, status: "FAILED" } }),
    prisma.conversion.count({ where: { clientId, isFavorite: true } }),
    prisma.conversion.groupBy({ by: ["format"], where: { clientId }, _count: true }),
  ]);

  const totalBytesSaved = await prisma.conversion.aggregate({
    where: { clientId, status: "COMPLETED" },
    _sum: { actualBytes: true },
  });

  return {
    totalConversions,
    completed,
    failed,
    favorites,
    formatBreakdown: formatBreakdown.map((row: { format: AudioFormat; _count: number }) => ({
      format: row.format,
      count: row._count,
    })),
    totalBytesDownloaded: totalBytesSaved._sum.actualBytes ?? 0,
  };
}

export async function recordSearch(clientId: string, url: string) {
  return prisma.searchHistory.create({ data: { clientId, url } });
}

export async function listSearchHistory(clientId: string) {
  return prisma.searchHistory.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
