/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Skip ESLint errors during Vercel build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
