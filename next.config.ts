import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloud.redislabs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    authInterrupts: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
