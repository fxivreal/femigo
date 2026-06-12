"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Copy, Download, Check, MessageCircle, RotateCcw, TrendingUp } from "lucide-react"
import { WhatsAppViralityScore } from "@/components/whatsapp-virality-score"

const FOLLOWUP_TYPES = [
  { id: "NEW_LEAD", label: "New Lead", icon: "👋", desc: "First touch with a warm lead" },
  { id: "QUOTE_FOLLOWUP", label: "Quote Follow-up", icon: "📋", desc: "After sending a proposal or pricing" },
  { id: "ABANDONED_PURCHASE", label: "Abandoned Purchase", icon: "🛒", desc: "Reminder for incomplete checkout" },
  { id: "CUSTOMER_REENGAGEMENT", label: "Re-engagement", icon: "🔄", desc: "Win back lapsed customers" },
  { id: "POST_PURCHASE", label: "Post-Purchase", icon: "✅", desc: "Thank you & support after sale" },
  { id: "TESTIMONIAL_REQUEST", label: "Testimonial Request", icon: "⭐", desc: "Ask for a review or feedback" },
] as const

const TONES = ["Friendly", "Professional", "Sales-Oriented"] as const

interface ParsedFollowUp {
  id: string
  label: string
  icon: string
  desc: string
  variations: Record<string, string[]>
}

function parseFollowUps(raw: string): ParsedFollowUp[] {
  const result: ParsedFollowUp[] = []

  for (const ft of FOLLOWUP_TYPES) {
    const headerRegex = new RegExp(`#${ft.id}\\s*\\n([\\s\\S]*?)(?=\\n#|$)`)
    const match = raw.match(headerRegex)
    if (!match) continue

    const body = match[1]
    const variations: Record<string, string[]> = {}

    for (const tone of TONES) {
      const toneRegex = new RegExp(
        `${tone}:\\s*\\n([\\s\\S]*?)(?=\\n(?:${TONES.join("|")}):|\\n#|$)`,
        "i"
      )
      const tMatch = body.match(toneRegex)
      if (!tMatch) continue

      const vars: string[] = []
      const varRegex = /Var\s*\d+:\s*([^\n]+)/g
      let vMatch
      while ((vMatch = varRegex.exec(tMatch[1])) !== null) {
        vars.push(vMatch[1].trim())
      }

      if (vars.length > 0) {
        variations[tone] = vars
      }
    }

    if (Object.keys(variations).length > 0) {
      result.push({ id: ft.id, label: ft.label, icon: ft.icon, desc: ft.desc, variations })
    }
  }

  return result
}

interface WhatsAppFollowUpViewerProps {
  content: string
  onRegenerate: () => void
}

export function WhatsAppFollowUpViewer({ content, onRegenerate }: WhatsAppFollowUpViewerProps) {
  const followUps = parseFollowUps(content)
  const [selectedTones, setSelectedTones] = useState<Record<string, string>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const getTone = (id: string) => selectedTones[id] || "Friendly"

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      toast.success("Copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleCopyType = async (ft: ParsedFollowUp) => {
    const tone = getTone(ft.id)
    const vars = ft.variations[tone]
    if (!vars) return
    const all = vars.map((v, i) => `Option ${i + 1}: ${v}`).join("\n\n")
    try {
      await navigator.clipboard.writeText(`${ft.label} (${tone}):\n\n${all}`)
      toast.success(`Copied all ${ft.label} variations!`)
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleCopyAll = async () => {
    try {
      const all = followUps
        .map((ft) => {
          const tone = getTone(ft.id)
          const vars = ft.variations[tone]
          if (!vars) return ""
          return `${ft.icon} ${ft.label} (${tone}):\n${vars.map((v, i) => `  ${i + 1}. ${v}`).join("\n")}`
        })
        .filter(Boolean)
        .join("\n\n")
      await navigator.clipboard.writeText(all)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
      toast.success("All follow-ups copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const all = followUps
      .map((ft) => {
        return TONES.map((tone) => {
          const vars = ft.variations[tone]
          if (!vars) return ""
          return `=== ${ft.label} (${tone}) ===\n${vars.map((v, i) => `Option ${i + 1}: ${v}`).join("\n")}`
        })
          .filter(Boolean)
          .join("\n\n")
      })
      .join("\n\n---\n\n")
    const blob = new Blob([all], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "whatsapp-follow-ups.txt"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported!")
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

  const handleSendType = async (ft: ParsedFollowUp) => {
    const tone = getTone(ft.id)
    const vars = ft.variations[tone]
    if (!vars) return
    try {
      const all = vars.map((v, i) => `Option ${i + 1}: ${v}`).join("\n\n")
      await navigator.clipboard.writeText(all)
      const encoded = encodeURIComponent(all.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  if (followUps.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {followUps.length} follow-up types · {TONES.length} tones · 3 variations each
        </p>
        <div className="flex gap-1 flex-wrap">
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

      {/* Follow-up type cards */}
      <div className="space-y-3">
        {followUps.map((ft) => {
          const tone = getTone(ft.id)
          const vars = ft.variations[tone] || []

          return (
            <Card key={ft.id} className="border-green-200 bg-green-50/30 overflow-hidden">
              <CardHeader className="py-2.5 border-b border-green-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ft.icon}</span>
                    <div>
                      <CardTitle className="text-sm text-green-700">{ft.label}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{ft.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {TONES.map((t) => {
                      const active = tone === t
                      const hasTone = ft.variations[t] && ft.variations[t].length > 0
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTones((prev) => ({ ...prev, [ft.id]: t }))}
                          disabled={!hasTone}
                          className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                            !hasTone
                              ? "opacity-30 cursor-not-allowed"
                              : active
                              ? "bg-green-600 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 pt-3 space-y-2">
                {vars.map((v, idx) => {
                  const key = `${ft.id}-${tone}-${idx}`
                  const isCopied = copiedKey === key

                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground mt-2.5 shrink-0 w-5">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <Textarea readOnly value={v} className="min-h-[48px] resize-none text-sm" />
                        <div className="flex gap-1 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => handleCopy(key, v)}
                          >
                            {isCopied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                            {isCopied ? "Done" : "Copy"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleSend(v)}
                          >
                            <MessageCircle className="size-2.5" />
                            <span className="hidden sm:inline">Send</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Type-level actions */}
                <div className="flex gap-1 pt-1 border-t border-green-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => handleCopyType(ft)}
                  >
                    <Copy className="size-2.5" />
                    Copy all ({vars.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleSendType(ft)}
                  >
                    <MessageCircle className="size-2.5" />
                    Send all
                  </Button>
                </div>

                {/* Virality score for first variation */}
                {vars[0] && (
                  <details className="group">
                    <summary className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground pt-1 pb-0.5">
                      <TrendingUp className="size-2.5" />
                      Show virality score
                    </summary>
                    <div className="pt-1">
                      <WhatsAppViralityScore content={vars[0]} compact allowAI />
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
