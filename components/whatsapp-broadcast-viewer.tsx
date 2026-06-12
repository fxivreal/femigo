"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Copy, Download, Check, MessageCircle, RotateCcw, TrendingUp } from "lucide-react"
import { WhatsAppViralityScore } from "@/components/whatsapp-virality-score"

interface BroadcastVersion {
  type: "Short" | "Medium" | "Long"
  text: string
}

interface BroadcastItem {
  type: string
  label: string
  icon: string
  versions: BroadcastVersion[]
}

const broadcastTypes: { id: string; label: string; icon: string }[] = [
  { id: "EDUCATIONAL", label: "Educational", icon: "📖" },
  { id: "PROMOTION", label: "Product Promotion", icon: "🏷️" },
  { id: "ANNOUNCEMENT", label: "Announcement", icon: "📢" },
  { id: "UPDATE", label: "Business Update", icon: "🔄" },
]

const VERSION_LABELS: BroadcastVersion["type"][] = ["Short", "Medium", "Long"]

function parseBroadcasts(raw: string): BroadcastItem[] {
  const items: BroadcastItem[] = []

  for (const bt of broadcastTypes) {
    const headerRegex = new RegExp(`#${bt.id}\\s*\\n([\\s\\S]*?)(?=\\n#|$)`)
    const match = raw.match(headerRegex)
    if (!match) continue

    const body = match[1]
    const versions: BroadcastVersion[] = []

    for (const vl of VERSION_LABELS) {
      const versionRegex = new RegExp(`${vl}:\\s*([^\\n]*(?:\\n(?!Short:|Medium:|Long:|#)[^\\n]*)*)`)
      const vMatch = body.match(versionRegex)
      if (vMatch) {
        versions.push({ type: vl, text: vMatch[1].trim() })
      }
    }

    if (versions.length > 0) {
      items.push({ type: bt.id, label: bt.label, icon: bt.icon, versions })
    }
  }

  return items
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length || 1
}

function calculateReadability(text: string): number {
  if (!text) return 0
  const words = countWords(text)
  const sentences = countSentences(text)
  const chars = text.replace(/\s/g, "").length
  const avgWordsPerSentence = words / sentences
  const avgCharsPerWord = chars / Math.max(words, 1)
  let score = 100
  score -= Math.max(0, (avgWordsPerSentence - 10) * 2.5)
  score -= Math.max(0, (avgCharsPerWord - 5) * 6)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function calculateResponseProbability(text: string): number {
  if (!text) return 0
  const lower = text.toLowerCase()
  let score = 35
  if (lower.includes("?") || lower.includes("dm") || lower.includes("order") || lower.includes("click") || lower.includes("visit") || lower.includes("call")) score += 15
  if (lower.includes("you") || lower.includes("your")) score += 10
  if (text.length < 200) score += 10
  else if (text.length > 400) score -= 10
  if (lower.includes("limited") || lower.includes("today") || lower.includes("now") || lower.includes("ends")) score += 10
  if (lower.includes("\u20a6") || lower.includes("price") || lower.includes("cost") || lower.includes("free")) score += 8
  if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) score += 4
  if (lower.includes("you") && lower.includes("?")) score += 5
  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-600 bg-green-100" }
  if (score >= 60) return { label: "Good", color: "text-emerald-600 bg-emerald-100" }
  if (score >= 40) return { label: "Fair", color: "text-amber-600 bg-amber-100" }
  return { label: "Needs Work", color: "text-red-600 bg-red-100" }
}

interface WhatsAppBroadcastViewerProps {
  content: string
  onRegenerate: () => void
}

export function WhatsAppBroadcastViewer({ content, onRegenerate }: WhatsAppBroadcastViewerProps) {
  const broadcasts = parseBroadcasts(content)
  const [selectedVersion, setSelectedVersion] = useState<Record<string, BroadcastVersion["type"]>>({})
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  if (broadcasts.length === 0) return null

  const getCurrentText = (item: BroadcastItem): string => {
    const vType = selectedVersion[item.type] || "Short"
    return item.versions.find((v) => v.type === vType)?.text || ""
  }

  const handleCopyVersion = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedVersion(key)
      setTimeout(() => setCopiedVersion(null), 2000)
      toast.success("Copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleCopyAll = async () => {
    try {
      const all = broadcasts
        .map((b) => {
          const vType = selectedVersion[b.type] || "Short"
          const v = b.versions.find((v) => v.type === vType)
          return `${b.label} (${vType}): ${v?.text || ""}`
        })
        .join("\n\n")
      await navigator.clipboard.writeText(all)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
      toast.success("All broadcast versions copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const all = broadcasts
      .map((b) => {
        return b.versions
          .map((v) => `=== ${b.label} (${v.type}) ===\n${v.text}`)
          .join("\n\n")
      })
      .join("\n\n---\n\n")
    const blob = new Blob([all], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "whatsapp-broadcasts.txt"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Broadcasts exported!")
  }

  const handleSend = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      const encoded = encodeURIComponent(text.slice(0, 1500))
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
          {broadcasts.length} broadcast types · {VERSION_LABELS.length} versions each
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

      {/* Broadcast type cards */}
      {broadcasts.map((item) => {
        const currentText = getCurrentText(item)
        const readability = calculateReadability(currentText)
        const responseProb = calculateResponseProbability(currentText)
        const readLabel = scoreLabel(readability)
        const respLabel = scoreLabel(responseProb)
        const versionKey = `${item.type}-${selectedVersion[item.type] || "Short"}`
        const isCopied = copiedVersion === versionKey

        return (
          <Card key={item.type} className="overflow-hidden border-green-200 bg-green-50/30">
            <CardHeader className="py-3 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <CardTitle className="text-sm text-green-700">{item.label}</CardTitle>
                </div>
                {/* Version pills */}
                <div className="flex gap-1">
                  {item.versions.map((v) => {
                    const active = (selectedVersion[item.type] || "Short") === v.type
                    return (
                      <button
                        key={v.type}
                        type="button"
                        onClick={() => setSelectedVersion((prev) => ({ ...prev, [item.type]: v.type }))}
                        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                          active
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {v.type}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3 pt-3 space-y-3">
              {/* Content */}
              <Textarea readOnly value={currentText} className="min-h-[80px] resize-none text-sm" />

              {/* Score badges */}
              <div className="flex gap-2 flex-wrap">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${readLabel.color}`}>
                  <span>Readability: {readability}</span>
                  <span>({readLabel.label})</span>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${respLabel.color}`}>
                  <span>Response Rate: {responseProb}%</span>
                  <span>({respLabel.label})</span>
                </div>
                <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                  {countWords(currentText)} words · {currentText.length} chars
                </span>
              </div>

              {/* Virality score */}
              {currentText && (
                <details className="group">
                  <summary className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground py-0.5">
                    <TrendingUp className="size-2.5" />
                    Show virality score
                  </summary>
                  <div className="pt-1">
                    <WhatsAppViralityScore content={currentText} compact allowAI />
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleCopyVersion(versionKey, currentText)}
                >
                  {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {isCopied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleSend(currentText)}
                >
                  <MessageCircle className="size-3" />
                  <span className="hidden sm:inline">Send to WhatsApp</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
