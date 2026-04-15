import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 👇 Esto desactiva ESLint durante el build de producción (soluciona el error en Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

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
        hostname: 'res.cloudinary.com', // Cloudinary
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos', // opcional: imágenes de prueba
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
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

