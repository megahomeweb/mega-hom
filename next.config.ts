import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve Firebase/static images as-is. Vercel Hobby image-optimization quota
    // returns 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED once exceeded, which
    // breaks product photos even when Storage URLs are fine.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
        pathname: "/**",
      },
    ],
  },
  crossOrigin: "anonymous",
};

export default nextConfig;
