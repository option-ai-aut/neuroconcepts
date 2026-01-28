/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Disabled to let Amplify handle the build natively
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
