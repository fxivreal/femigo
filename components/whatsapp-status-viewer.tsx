"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, Download, RotateCcw, Check, MessageCircle, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react"
import { WhatsAppViralityScore } from "@/components/whatsapp-virality-score"

interface WhatsAppStatusViewerProps {
  content: string
  statusCount: number
  onRegenerate: () => void
}

function parseStatuses(raw: string): string[] {
  const parts = raw.split(/\n\s*(?=Status\s+\d+:)/g)
  if (parts.length > 1) {
    return parts
      .map((p) => p.replace(/^Status\s+\d+:\s*/, "").trim())
      .filter(Boolean)
  }
  return raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
}

export function WhatsAppStatusViewer({ content, statusCount, onRegenerate }: WhatsAppStatusViewerProps) {
  const statuses = parseStatuses(content)
  const displayCount = Math.min(statuses.length, statusCount)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  if (displayCount === 0) return null

  const current = statuses[currentIndex] || ""

  const handleCopyStatus = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      toast.success(`Status ${index + 1} copied!`)
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleCopyAll = async () => {
    try {
      const all = statuses.slice(0, displayCount).map((s, i) => `Status ${i + 1}: ${s}`).join("\n\n")
      await navigator.clipboard.writeText(all)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
      toast.success("All statuses copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const all = statuses.slice(0, displayCount).map((s, i) => `Status ${i + 1}: ${s}`).join("\n\n")
    const blob = new Blob([all], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "whatsapp-statuses.txt"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Statuses exported!")
  }

  const handleSendStatus = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      const encoded = encodeURIComponent(text.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleSendAll = async () => {
    try {
      const all = statuses.slice(0, displayCount).map((s, i) => `Status ${i + 1}: ${s}`).join("\n\n")
      await navigator.clipboard.writeText(all)
      const encoded = encodeURIComponent(all.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {displayCount} status{displayCount !== 1 ? "ies" : "y"} · Showing {currentIndex + 1} of {displayCount}
        </p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopyAll}>
            {copiedAll ? <Check className="size-3" /> : <Copy className="size-3" />}
            <span className="hidden sm:inline">Copy All</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleExport}>
            <Download className="size-3" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onRegenerate}>
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline">Regenerate</span>
          </Button>
        </div>
      </div>

      {/* Phone mockup card */}
      <div className="flex items-center justify-center">
        {/* Prev button */}
        {displayCount > 1 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 mr-2"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {/* Phone frame */}
        <div className="bg-neutral-900 text-white rounded-[28px] p-3 w-full max-w-[280px] shadow-xl border-2 border-neutral-700">
          {/* Status bar */}
          <div className="flex justify-between items-center px-1 mb-3">
            <span className="text-[10px] text-white/50">{new Date().getHours().toString().padStart(2, "0")}:{new Date().getMinutes().toString().padStart(2, "0")}</span>
            <span className="text-[10px] text-white/50">Status</span>
            <div className="flex gap-0.5">
              <div className="size-1 rounded-full bg-white/50" />
              <div className="size-1 rounded-full bg-white/50" />
              <div className="size-1 rounded-full bg-white/50" />
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[280px] flex flex-col justify-center px-2 py-4">
            <p className="text-base leading-relaxed text-center text-white/90">{current}</p>
          </div>

          {/* Progress dots */}
          {displayCount > 1 && (
            <div className="flex justify-center gap-1 mb-2">
              {Array.from({ length: displayCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Bottom bar */}
          <div className="flex justify-between text-[10px] text-white/40 px-1 mt-2">
            <span>Reply</span>
            <span>DM</span>
          </div>
        </div>

        {/* Next button */}
        {displayCount > 1 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(displayCount - 1, prev + 1))}
            disabled={currentIndex === displayCount - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 ml-2"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      {/* Actions under phone */}
      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={() => handleCopyStatus(currentIndex, current)}
        >
          {copiedIndex === currentIndex ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copiedIndex === currentIndex ? "Copied!" : `Copy Status ${currentIndex + 1}`}
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => handleSendStatus(current)}
        >
          <MessageCircle className="size-3.5" />
          Send Status {currentIndex + 1}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          onClick={handleSendAll}
        >
          <MessageCircle className="size-3.5" />
          <span className="hidden sm:inline">Send All</span>
        </Button>
      </div>

      {/* Virality score for current status */}
      {current && (
        <details className="group">
          <summary className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground py-1">
            <TrendingUp className="size-2.5" />
            Virality score for this status
          </summary>
          <div className="pt-1">
            <WhatsAppViralityScore content={current} compact allowAI />
          </div>
        </details>
      )}

      {/* All statuses list */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground font-medium mb-2">
          View all {displayCount} statuses
        </summary>
        <div className="space-y-2">
          {statuses.slice(0, displayCount).map((text, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
              <span className="shrink-0 size-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs flex-1">{text}</p>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-6 w-6 p-0"
                onClick={() => handleCopyStatus(i, text)}
              >
                {copiedIndex === i ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
