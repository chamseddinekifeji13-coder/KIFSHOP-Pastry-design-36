/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Turbopack est le bundler par défaut de Next.js 16
  // ✅ Pas besoin de webpack config - Turbopack gère tout
  productionBrowserSourceMaps: true,
}

module.exports = nextConfig
