import type { NextConfig } from "next"
import withSerwist from "@serwist/next"

const nextConfig: NextConfig = {};

export default withSerwist({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
})(nextConfig);