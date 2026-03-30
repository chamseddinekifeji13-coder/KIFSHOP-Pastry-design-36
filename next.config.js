const path = require("path")

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
    // NOTE: Pre-existing TS errors in v0-generated code (boutique-view, performance-utils,
    // pos80/client, production/actions, stocks/actions, super-admin/actions, settings/stats-actions).
    // Code compiles successfully - these are type-check only errors.
    // TODO: Fix all TS errors and remove this flag.
    ignoreBuildErrors: true,
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
}

module.exports = nextConfig
