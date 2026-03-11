import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true
});

const nextConfig: NextConfig = {
  typedRoutes: true
};

export default withPWA(nextConfig);
