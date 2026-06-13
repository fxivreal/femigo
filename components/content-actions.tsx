"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Copy,
  Download,
  Star,
  RotateCcw,
  StarOff,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react"
import { PublishButton } from "@/components/publish-button"

interface ContentActionsProps {
  content: string
  platformLabel: string
  platform?: string
  contentId?: string
  isFavorited?: boolean
  onRegenerate?: () => void
  onFavoriteToggle?: (id: string, favorited: boolean) => Promise<void>
  showRegenerate?: boolean
  /** Pass all generated items for "Publish All" — each item needs { content, label?, platformType? } */
  allPublishItems?: { content: string; label?: string; platformType?: string }[]
}

export function ContentActions({
  content,
  platformLabel,
  platform,
  contentId,
  isFavorited,
  onRegenerate,
  onFavoriteToggle,
  showRegenerate = false,
  allPublishItems,
}: ContentActionsProps) {
  const [favoriting, setFavoriting] = useState(false)
  const [favoriteState, setFavoriteState] = useState(isFavorited ?? false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(`${platformLabel} content copied!`)
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${platformLabel.replace(/\s+/g, "-").toLowerCase()}-content.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${platformLabel} content exported!`)
  }

  const handleFavorite = async () => {
    if (!contentId || !onFavoriteToggle) return
    setFavoriting(true)
    try {
      await onFavoriteToggle(contentId, !favoriteState)
      setFavoriteState((prev) => !prev)
      toast.success(favoriteState ? "Removed from favorites" : "Added to favorites")
    } catch {
      toast.error("Failed to update favorite.")
    } finally {
      setFavoriting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1"
        onClick={handleCopy}
      >
        <Copy className="size-3" />
        <span className="hidden sm:inline">Copy</span>
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1"
        onClick={handleExport}
      >
        <Download className="size-3" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      {platform && platform.startsWith("whatsapp_") && (
        <PublishButton
          items={[{ content, platformType: platform }]}
          buttonLabel="Publish"
          variant="ghost"
          className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
        />
      )}

      {contentId && onFavoriteToggle && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={handleFavorite}
          disabled={favoriting}
        >
          {favoriting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : favoriteState ? (
            <StarOff className="size-3" />
          ) : (
            <Star className="size-3" />
          )}
          <span className="hidden sm:inline">
            {favoriteState ? "Unfavorite" : "Favorite"}
          </span>
        </Button>
      )}

      {showRegenerate && onRegenerate && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={onRegenerate}
        >
          <RotateCcw className="size-3" />
          <span className="hidden sm:inline">Regenerate</span>
        </Button>
      )}
    </div>
  )
}
