import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  transpilePackages: ['@sce/types', '@sce/constants'],
};

export default nextConfig;
