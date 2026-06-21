export type SourcePlatform =
  | "YOUTUBE"
  | "YOUTUBE_SHORTS"
  | "INSTAGRAM"
  | "TIKTOK"
  | "FACEBOOK"
  | "TWITTER"
  | "DIRECT_URL"
  | "OTHER";

export type AudioFormat = "MP3" | "WAV" | "M4A" | "AAC";
export type Bitrate = 128 | 192 | 256 | 320;
export type JobStatus = "PENDING" | "ANALYZING" | "CONVERTING" | "TRIMMING" | "COMPLETED" | "FAILED";

export interface SizeEstimate {
  bitrateKbps: Bitrate;
  estimatedBytes: number;
  estimatedSizeLabel: string;
}

export interface VideoMetadata {
  url: string;
  platform: SourcePlatform;
  title: string;
  author: string | null;
  thumbnail: string | null;
  durationSec: number;
  canDownload: boolean;
  sizeEstimates: SizeEstimate[];
}

export interface ConversionRecord {
  id: string;
  status: JobStatus;
  progress: number;
  format: AudioFormat;
  bitrateKbps: number;
  trimStartSec: number | null;
  trimEndSec: number | null;
  estimatedBytes: number | null;
  actualBytes: number | null;
  downloadUrl: string | null;
  isFavorite: boolean;
  errorMessage: string | null;
  createdAt: string;
  video: {
    title: string;
    author: string | null;
    thumbnail: string | null;
    durationSec: number;
    platform: SourcePlatform;
  };
}

export interface DashboardStats {
  totalConversions: number;
  completed: number;
  failed: number;
  favorites: number;
  formatBreakdown: { format: AudioFormat; count: number }[];
  totalBytesDownloaded: number;
}
