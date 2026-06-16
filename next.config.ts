import type { NextConfig } from "next"
import withSerwist from "@serwist/next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/cli",
    "@remotion/compositor-win32-x64-msvc",
    "@remotion/media-utils",
    "@remotion/zod-types",
    "remotion",
  ],
};

export default withSerwist({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
  disable: false,
})(nextConfig);