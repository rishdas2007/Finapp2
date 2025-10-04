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
  // Don't try to pre-render API routes during build
  skipTrailingSlashRedirect: true,
  // Mark API routes as dynamic
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
