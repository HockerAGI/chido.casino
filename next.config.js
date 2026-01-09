/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Asegura que las cookies funcionen correctamente tras proxies (Vercel/Cloudflare)
  poweredByHeader: false, 
};

module.exports = nextConfig;