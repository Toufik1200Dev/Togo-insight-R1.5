/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For container/Docker deploys, uncomment to emit a minimal standalone server:
  // output: "standalone",
  eslint: {
    // Don't fail production builds on lint warnings (CI/Azure friendly).
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow remote logos/marketing imagery if you host assets on Azure Blob/CDN.
    remotePatterns: [
      { protocol: "https", hostname: "**.blob.core.windows.net" },
      { protocol: "https", hostname: "**.azureedge.net" },
    ],
  },
};

module.exports = nextConfig;
