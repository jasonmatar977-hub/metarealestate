/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize for Vercel deployment
  poweredByHeader: false,
  compress: true,
  // Ensure API routes work correctly
  experimental: {
    // Next.js 15 optimizations
  },
  // Prevent chunk load errors in dev mode
  // Ensure consistent chunk URLs
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable static optimization in dev to prevent stale chunks
  ...(process.env.NODE_ENV === 'development' && {
    // Ensure chunks are always fresh in dev
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        // Disable chunk caching in dev mode
        config.cache = false;
      }
      return config;
    },
  }),
}

module.exports = nextConfig

