/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Video platform thumbnails are hosted on a wide range of CDNs —
    // allow any https host rather than maintaining an exhaustive list.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async rewrites() {
    // Lets the frontend call relative "/api/..." paths in development
    // while the Express server actually runs on a different port.
    // In production, set NEXT_PUBLIC_API_URL and call it directly —
    // see lib/api.ts.
    return [{ source: "/api/:path*", destination: "http://localhost:4000/api/:path*" }];
  },
};

module.exports = nextConfig;
