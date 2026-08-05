/**
 * Static export for GitHub Pages. PRD §12.
 *
 * `basePath` must match the repository name. It is read from an env var so the
 * same config serves `pnpm dev` (no basePath) and `pnpm preview` / CI (basePath
 * set), without a second config file.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
}

module.exports = nextConfig
