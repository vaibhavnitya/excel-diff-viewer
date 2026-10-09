import createMDX from '@next/mdx';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  keepBackground: false,
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'wrap',
          properties: {
            className: ['anchor-link'],
          },
        },
      ],
      [rehypePrettyCode, prettyCodeOptions],
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  transpilePackages: [
    '@mojro/excel-diff-core',
    '@mojro/excel-diff-react',
    '@mojro/excel-diff-ui',
  ],
  eslint: {
    // Lint runs from the workspace ESLint config in CI. Next 14's built-in lint expects eslintrc.
    ignoreDuringBuilds: true,
  },
};

export default withMDX(nextConfig);
