/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://hirely-ai-powered-job-platform-production.up.railway.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
