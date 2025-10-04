/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@financial-dashboard/ui', '@financial-dashboard/database', '@financial-dashboard/analytics'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
