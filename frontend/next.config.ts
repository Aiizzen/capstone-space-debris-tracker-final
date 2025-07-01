/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  reactStrictMode: true,

  /* ---------- 1.  Tell Next.js where Cesium static files live ---------- */
  assetPrefix: '', // leave empty for local dev; you can set CDN prefix on Vercel

  /* ---------- 2.  Expose runtime config if you need it (optional) ------ */
  publicRuntimeConfig: {
    cesiumBaseUrl: '/Cesium',
  },

  /* ---------- 3.  Extra webpack tweaks for Cesium ---------------------- */
  webpack: (config, { isServer }) => {
    // Cesium uses AMD‑style require; mark it as externals-friendly
    config.amd = { toUrlUndefined: true };

    // Alias cesium so imports resolve cleanly
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      cesium: path.resolve(__dirname, 'node_modules/cesium'),
    };

    // Copy Cesium asset files (images, glTF, etc.) into Next's build output
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|xml|json|glb|gltf)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/cesium/[hash][ext][query]',
      },
    });

    return config;
  },
};

module.exports = nextConfig;
