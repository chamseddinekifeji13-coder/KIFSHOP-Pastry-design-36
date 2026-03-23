/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  webpack: (config, { isDev }) => {
    if (isDev) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

module.exports = nextConfig;
