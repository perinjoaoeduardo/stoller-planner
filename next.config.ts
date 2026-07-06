import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.241"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hsxitkcwpopflokpopjs.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
