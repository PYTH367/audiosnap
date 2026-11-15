-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('YOUTUBE', 'YOUTUBE_SHORTS', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'TWITTER', 'DIRECT_URL', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ANALYZING', 'CONVERTING', 'TRIMMING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('MP3', 'WAV', 'M4A', 'AAC');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoMetadata" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "thumbnail" TEXT,
    "durationSec" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "videoMetadataId" TEXT NOT NULL,
    "format" "AudioFormat" NOT NULL,
    "bitrateKbps" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "trimStartSec" DOUBLE PRECISION,
    "trimEndSec" DOUBLE PRECISION,
    "estimatedBytes" INTEGER,
    "actualBytes" INTEGER,
    "outputPath" TEXT,
    "downloadUrl" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoMetadata_url_key" ON "VideoMetadata"("url");

-- CreateIndex
CREATE INDEX "Conversion_clientId_createdAt_idx" ON "Conversion"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_status_idx" ON "Conversion"("status");

-- CreateIndex
CREATE INDEX "SearchHistory_clientId_createdAt_idx" ON "SearchHistory"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_videoMetadataId_fkey" FOREIGN KEY ("videoMetadataId") REFERENCES "VideoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
