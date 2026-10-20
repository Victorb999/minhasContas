import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco local de desenvolvimento) carrega WASM; não deve ser empacotado.
  serverExternalPackages: ["@electric-sql/pglite", "exceljs"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
