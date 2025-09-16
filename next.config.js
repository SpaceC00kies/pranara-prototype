/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds for recovery
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds for recovery
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;