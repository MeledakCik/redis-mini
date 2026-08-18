/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Task 2: build standalone server (.next/standalone) supaya Dockerfile bisa COPY hasil
  // build minimal (tanpa seluruh node_modules) — dipakai baik di image VPS (docker-compose)
  // maupun Railway (nixpacks + Dockerfile sama-sama jalanin `node server.js`).
  output: "standalone",
  webpack: (config) => {
    // dockerode -> docker-modem -> ssh2 punya optional native deps (dipakai utk koneksi ssh://)
    // kita cuma konek ke local docker socket, jadi aman untuk diabaikan biar build bersih.
    config.resolve.alias = {
      ...config.resolve.alias,
      "cpu-features": false,
      "./crypto/build/Release/sshcrypto.node": false,
    };
    return config;
  },
};

export default nextConfig;
