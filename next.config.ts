import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/checklist/download": ["./FORM 01-06 EVIDENZE DI AUDIT.xlsm"],
    "/api/checklist": ["./FORM 01-06 EVIDENZE DI AUDIT.xlsm"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
