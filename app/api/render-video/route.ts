import { NextResponse } from "next/server"
import { bundle, BundlerInternals } from "@remotion/bundler"
import { renderMedia, getCompositions } from "@remotion/renderer"
import path from "path"
import fs from "fs/promises"
import os from "os"

export const runtime = "nodejs"
export const maxDuration = 120

const entryPoint = path.resolve(process.cwd(), "video", "Root.tsx")

let cachedBundle: string | null = null

async function getBundle(): Promise<string> {
  if (cachedBundle) return cachedBundle
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => {
      const CopyPlugin = config.plugins?.find(
        (p) => p.constructor.name === "CopyPlugin" || p.constructor.name === "CopyWebpackPlugin"
      ) as { patterns?: { globOptions?: { ignore?: string[] } }[] } | undefined
      if (CopyPlugin?.patterns) {
        for (const pattern of CopyPlugin.patterns) {
          pattern.globOptions = {
            ...pattern.globOptions,
            ignore: [...(pattern.globOptions?.ignore || []), "**/sw.js", "**/sw-*"],
          }
        }
      }
      return config
    },
  })
  cachedBundle = bundleLocation
  return bundleLocation
}

export async function POST(request: Request) {
  try {
    const { templateId, inputProps, outputFileName } = await request.json() as {
      templateId: string
      inputProps: Record<string, unknown>
      outputFileName?: string
    }

    const serveUrl = await getBundle()
    const compositions = await getCompositions(serveUrl, { inputProps })
    const composition = compositions.find((c) => c.id === templateId)

    if (!composition) {
      return NextResponse.json(
        { error: `Composition "${templateId}" not found. Available: ${compositions.map((c) => c.id).join(", ")}` },
        { status: 404 }
      )
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "femigo-video-"))
    const outputPath = path.join(tmpDir, outputFileName || `output.mp4`)

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
    })

    const fileBuffer = await fs.readFile(outputPath)
    await fs.rm(tmpDir, { recursive: true, force: true })

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${outputFileName || "video.mp4"}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Render error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
