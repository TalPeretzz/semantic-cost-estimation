/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  transpilePackages: ['@sce/types', '@sce/constants'],
};

export default nextConfig;
