import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Compression y optimización
  compress: true,
  productionBrowserSourceMaps: false,

  // Optimización de Turbopack
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', '@ant-design/icons', 'antd', 'framer-motion', 'dayjs'],
    reactCompiler: false,
  },

  // Packages used only on the server — Turbopack/webpack must not bundle them
  serverExternalPackages: ['resend', 'svix', 'postal-mime'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vueltaymediabcn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()'
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://picsum.photos",
          "media-src 'self' https://res.cloudinary.com",
          "font-src 'self' data:",
          "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com",
          "frame-src 'self' https://checkout.payulatam.com https://sandbox.checkout.payulatam.com",
          "form-action 'self' https://checkout.payulatam.com https://sandbox.checkout.payulatam.com",
          "base-uri 'self'",
          "object-src 'none'",
        ].join('; ')
      },
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
          ]
        : []),
    ];

    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.webp',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.avif',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);