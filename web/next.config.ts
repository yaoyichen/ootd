import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dashscope-result-**.oss-cn-**.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "**.oss-cn-**.aliyuncs.com",
      },
    ],
  },
};

export default nextConfig;
