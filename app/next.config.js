/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Fix Leaflet SSR issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  },
}

module.exports = nextConfig
