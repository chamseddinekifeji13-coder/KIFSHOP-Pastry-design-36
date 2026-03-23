/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Turbopack + Webpack compatibilité hybride
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // ✅ GARDER webpack config existante pour stabilité
  webpack: (config, { isServer, buildId }) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })
    return config
  },

  // ✅ Source maps + stabilité
  productionBrowserSourceMaps: true,
  swcMinify: true,
}

module.exports = nextConfig
