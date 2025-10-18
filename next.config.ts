import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn-res.keymedia.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
