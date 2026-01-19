/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "fictional-disco-r6p94qgggprcppgr-3000.app.github.dev",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
