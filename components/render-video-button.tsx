"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Film, Loader2, Download } from "lucide-react"

interface RenderVideoButtonProps {
  title: string
  subtitle?: string
  ctaText?: string
  templateId?: "TextOverlay" | "SocialClip"
  label?: string
  size?: "default" | "sm" | "lg"
  variant?: "default" | "ghost" | "outline"
  className?: string
}

type RenderStatus = "idle" | "bundling" | "rendering" | "done" | "error"

export function RenderVideoButton({
  title,
  subtitle,
  ctaText,
  templateId = "SocialClip",
  label = "Render Video",
  size = "sm",
  variant = "ghost",
  className,
}: RenderVideoButtonProps) {
  const [status, setStatus] = useState<RenderStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const handleRender = async () => {
    setStatus("bundling")
    setError(null)
    setDownloadUrl(null)

    try {
      const inputProps: Record<string, unknown> = { title }
      if (subtitle) inputProps.subtitle = subtitle
      if (ctaText) inputProps.ctaText = ctaText

      setStatus("rendering")

      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          inputProps,
          outputFileName: `${title.replace(/\s+/g, "-").toLowerCase().slice(0, 50)}.mp4`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Render failed")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed")
      setStatus("error")
    }
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `${title.replace(/\s+/g, "-").toLowerCase().slice(0, 50)}.mp4`
    a.click()
    URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setStatus("idle")
  }

  if (status === "done" && downloadUrl) {
    return (
      <Button size={size} variant="default" onClick={handleDownload} className={className}>
        <Download className="size-3 mr-1" />
        Download Video
      </Button>
    )
  }

  const isLoading = status === "bundling" || status === "rendering"

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        size={size}
        variant={isLoading ? "outline" : variant}
        onClick={handleRender}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="size-3 mr-1 animate-spin" />
        ) : (
          <Film className="size-3 mr-1" />
        )}
        {isLoading
          ? status === "bundling"
            ? "Preparing..."
            : "Rendering..."
          : label}
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
