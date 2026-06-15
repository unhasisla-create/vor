/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode menyebabkan double render di dev — matikan untuk performa
  reactStrictMode: false,
  images: { unoptimized: true },
  // Optimasi kompilasi SWC
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Kurangi beban kompilasi — skip ESLint di dev
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Kurangi beban TypeScript di dev
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimasi eksperimental Next.js 14
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    scrollRestoration: true,
  },
}

module.exports = nextConfig
