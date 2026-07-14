import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'wasm-unsafe-eval' lets @react-pdf/renderer load its yoga wasm; 'unsafe-eval' kept for the renderer's JS.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.ibb.co https://*.ibb.co https://*.supabase.co",
      "font-src 'self' data:",
      // data: + blob: let react-pdf fetch its yoga wasm (data: URI) and blob assets;
      // i.ibb.co lets fetchAsDataUri pull the remote logo into the PDF.
      "connect-src 'self' data: blob: https://i.ibb.co https://*.ibb.co https://*.supabase.co wss://*.supabase.co https://api.imgbb.com",
      // blob: lets @react-pdf/renderer spawn its layout worker.
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allows CI/verification builds to run while the local dev server is active.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Buffer for @react-pdf is polyfilled at runtime in pdfService.ensureBufferPolyfill
};

export default nextConfig;
