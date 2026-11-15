/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (process.env.NODE_ENV === "production") {
  const requiredVariables = [
    "NEXT_PUBLIC_API_URL",
    "GITHUB_ID",
    "GITHUB_SECRET",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "API_TOKEN_SECRET",
  ];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);
  if (missingVariables.length) {
    throw new Error(`Missing production environment variables: ${missingVariables.join(", ")}`);
  }

  if (process.env.NEXTAUTH_SECRET.length < 32 || process.env.API_TOKEN_SECRET.length < 32) {
    throw new Error("NEXTAUTH_SECRET and API_TOKEN_SECRET must each be at least 32 characters.");
  }

  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL must be set for production builds.");

  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL ending in /api.");
  }

  if (
    parsedApiUrl.protocol !== "https:" ||
    parsedApiUrl.pathname !== "/api" ||
    parsedApiUrl.search ||
    parsedApiUrl.hash ||
    parsedApiUrl.username ||
    parsedApiUrl.password
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must be an HTTP(S) URL ending exactly in /api.");
  }

  const parsedAuthUrl = new URL(process.env.NEXTAUTH_URL);
  if (parsedAuthUrl.protocol !== "https:" || parsedAuthUrl.pathname !== "/" || parsedAuthUrl.search || parsedAuthUrl.hash) {
    throw new Error("NEXTAUTH_URL must be the HTTPS origin of the deployed frontend.");
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Video platform thumbnails are hosted on a wide range of CDNs —
    // allow any https host rather than maintaining an exhaustive list.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    // Keep /api/auth on NextAuth; proxy only backend endpoints.
    return [
      { source: "/api/analyze/:path*", destination: "http://localhost:4000/api/analyze/:path*" },
      { source: "/api/convert/:path*", destination: "http://localhost:4000/api/convert/:path*" },
      { source: "/api/trim/:path*", destination: "http://localhost:4000/api/trim/:path*" },
      { source: "/api/history/:path*", destination: "http://localhost:4000/api/history/:path*" },
      { source: "/api/download/:path*", destination: "http://localhost:4000/api/download/:path*" },
      { source: "/api/waveform", destination: "http://localhost:4000/api/waveform" },
    ];
  },
};

module.exports = nextConfig;
