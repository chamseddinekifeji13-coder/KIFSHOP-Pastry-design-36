const path = require("path")
const buildStamp =
  process.env.SW_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  "dev-local"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16: Turbopack par defaut
  turbopack: {
    root: path.resolve(__dirname),
  },
  
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false, // Disable source maps in production for security
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.shields.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    NEXT_PUBLIC_SW_BUILD: buildStamp,
  },
}

module.exports = nextConfig
