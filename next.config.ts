import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const tiles = (() => {
  try {
    return new URL((process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png").replace(/\{[a-z]\}/g, "a")).origin;
  } catch {
    return "https://tile.openstreetmap.org";
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${tiles} https://*.tile.openstreetmap.org https://lh3.googleusercontent.com ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""} https://nominatim.openstreetmap.org`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Server-side PDF rendering (volunteer certificates) runs as a plain Node package
  serverExternalPackages: ["@react-pdf/renderer"],
  // pdfkit loads its built-in fonts (Helvetica, Times, Courier) and fs/zlib helpers through package
  // "#imports" that Vercel's file tracing misses; ship them with the certificate PDF route.
  outputFileTracingIncludes: {
    "/certificate/[userId]/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*", "./node_modules/pdfkit/js/data/**/*", "./node_modules/pdfkit/lib/**/*", "./node_modules/pdfkit/package.json"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      ...(supabase ? [{ protocol: "https" as const, hostname: new URL(supabase).hostname }] : []),
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
