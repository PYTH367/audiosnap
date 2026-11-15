/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (process.env.NODE_ENV === "production") {
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be set for production builds.");
  }

  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL ending in /api.");
  }

  if (
    !["http:", "https:"].includes(parsedApiUrl.protocol) ||
    parsedApiUrl.pathname !== "/api" ||
    parsedApiUrl.search ||
    parsedApiUrl.hash ||
    parsedApiUrl.username ||
    parsedApiUrl.password
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must be an HTTP(S) URL ending exactly in /api.");
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

    // Local fallback for clients that use the relative "/api" base URL.
    return [{ source: "/api/:path*", destination: "http://localhost:4000/api/:path*" }];
  },
};

module.exports = nextConfig;
