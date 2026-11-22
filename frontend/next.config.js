/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Never fail `npm run dev` or `npm run build` on TypeScript/ESLint errors ──
  // Errors are shown in the browser overlay but don't crash the server.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Backend API proxy ──────────────────────────────────────────────────────
  // Rewrites /api/* → http://localhost:8000/api/* so the frontend never needs
  // CORS handling and NEXT_PUBLIC_BACKEND_URL can stay empty.
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
