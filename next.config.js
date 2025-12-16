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
}

module.exports = nextConfig

