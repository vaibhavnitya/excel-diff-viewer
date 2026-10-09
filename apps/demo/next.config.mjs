/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@your-scope/excel-diff-core',
    '@your-scope/excel-diff-react',
    '@your-scope/excel-diff-ui',
  ],
  eslint: {
    // Lint runs from the workspace ESLint config in CI. Next 14's built-in lint expects eslintrc.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
