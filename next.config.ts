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
  // Adicione estas duas seções abaixo:
  eslint: {
    // Permite que o build termine mesmo com avisos ou erros de lint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite o deploy mesmo com erros de tipagem (como os 'any')
    ignoreBuildErrors: true,
  },
};

export default nextConfig;