/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Midtrans QR code image host
      {
        protocol: 'https',
        hostname: 'api.midtrans.com',
      },
      {
        protocol: 'https',
        hostname: 'api.sandbox.midtrans.com',
      },
      {
        protocol: 'https',
        hostname: 'qris.online',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['midtrans-client'],
  },
}

export default nextConfig
