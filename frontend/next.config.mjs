/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
