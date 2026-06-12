"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Copy, Download, Check, MessageCircle, RotateCcw, Save, FolderOpen, ArrowDown, Loader2, TrendingUp } from "lucide-react"
import { WhatsAppViralityScore } from "@/components/whatsapp-virality-score"

const FUNNEL_STAGES = [
  { id: "AWARENESS", label: "Awareness", icon: "🔍", desc: "Introduce the problem — no selling yet" },
  { id: "INTEREST", label: "Interest", icon: "💡", desc: "Share a valuable insight" },
  { id: "TRUST", label: "Trust Building", icon: "🤝", desc: "Build credibility" },
  { id: "OFFER", label: "Offer", icon: "🎯", desc: "Present your offer" },
  { id: "URGENCY", label: "Urgency", icon: "⏰", desc: "Add time scarcity" },
  { id: "FOLLOWUP", label: "Follow-up", icon: "📩", desc: "Re-engage without pressure" },
] as const

const TONES = ["Soft", "Balanced", "Aggressive"] as const

interface ParsedStage {
  id: string
  label: string
  icon: string
  desc: string
  versions: Record<string, string>
}

interface SavedCampaign {
  id: string
  name: string
  stages: Record<string, Record<string, string>>
  createdAt: { toDate?: () => Date } | string
}

function parseFunnel(raw: string): ParsedStage[] {
  const stages: ParsedStage[] = []
  for (const stage of FUNNEL_STAGES) {
    const headerRegex = new RegExp(`#${stage.id}\\s*\\n([\\s\\S]*?)(?=\\n#|$)`)
    const match = raw.match(headerRegex)
    if (!match) continue
    const body = match[1]
    const versions: Record<string, string> = {}
    for (const tone of TONES) {
      const toneRegex = new RegExp(`${tone}:\\s*([^\\n]*(?:\\n(?!Soft:|Balanced:|Aggressive:|#)[^\\n]*)*)`)
      const tMatch = body.match(toneRegex)
      if (tMatch) versions[tone] = tMatch[1].trim()
    }
    if (Object.keys(versions).length > 0) {
      stages.push({ id: stage.id, label: stage.label, icon: stage.icon, desc: stage.desc, versions })
    }
  }
  return stages
}

function buildCampaignData(stages: ParsedStage[]): Record<string, Record<string, string>> {
  const data: Record<string, Record<string, string>> = {}
  for (const s of stages) {
    data[s.id] = { ...s.versions }
  }
  return data
}

interface WhatsAppFunnelViewerProps {
  content: string
  sourceContent: string
  onRegenerate: () => void
}

export function WhatsAppFunnelViewer({ content, sourceContent, onRegenerate }: WhatsAppFunnelViewerProps) {
  const { user } = useAuth()
  const stages = parseFunnel(content)
  const [selectedTone, setSelectedTone] = useState<Record<string, string>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (user && showSaved) loadCampaigns()
  }, [user, showSaved])

  const loadCampaigns = async () => {
    if (!user) return
    setLoadingCampaigns(true)
    try {
      const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore")
      const { getDbInstance } = await import("@/lib/firebase")
      const db = await getDbInstance()
      const q = query(
        collection(db, "whatsappCampaigns"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
      const snap = await getDocs(q)
      const campaigns: SavedCampaign[] = []
      snap.forEach((doc) => {
        campaigns.push({ id: doc.id, ...doc.data() } as SavedCampaign)
      })
      setSavedCampaigns(campaigns)
    } catch {
      // silent
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const handleSaveCampaign = async () => {
    if (!user) return
    const name = campaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`
    setSaving(true)
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      const { getDbInstance } = await import("@/lib/firebase")
      const db = await getDbInstance()
      await addDoc(collection(db, "whatsappCampaigns"), {
        userId: user.uid,
        name,
        stages: buildCampaignData(stages),
        sourceContent: sourceContent.slice(0, 500),
        createdAt: serverTimestamp(),
      })
      toast.success(`Campaign "${name}" saved!`)
      setCampaignName("")
      loadCampaigns()
    } catch {
      toast.error("Failed to save campaign.")
    } finally {
      setSaving(false)
    }
  }

  const handleLoadCampaign = (campaign: SavedCampaign) => {
    // Reconstruct content from saved stages
    const lines: string[] = []
    for (const stage of FUNNEL_STAGES) {
      const stageData = campaign.stages[stage.id]
      if (!stageData) continue
      lines.push(`#${stage.id}`)
      for (const tone of TONES) {
        if (stageData[tone]) lines.push(`${tone}: ${stageData[tone]}`)
      }
      lines.push("")
    }
    // This is a signal to the parent — we rebuild the content
    // For simplicity, we just update the local state and the viewer re-renders
    // We'll handle this by dispatching a custom event or using the page's state
    window.dispatchEvent(new CustomEvent("load-funnel", { detail: { content: lines.join("\n") } }))
    toast.success(`Campaign "${campaign.name}" loaded!`)
  }

  const getCurrentText = (stage: ParsedStage): string => {
    const tone = selectedTone[stage.id] || "Balanced"
    return stage.versions[tone] || ""
  }

  const handleCopyStage = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      toast.success("Copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleCopyAll = async () => {
    try {
      const all = stages
        .map((s) => {
          const tone = selectedTone[s.id] || "Balanced"
          return `${s.icon} ${s.label} (${tone}): ${s.versions[tone] || ""}`
        })
        .join("\n\n")
      await navigator.clipboard.writeText(all)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
      toast.success("All funnel messages copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const all = stages
      .map((s) => {
        return TONES.map((t) => `=== ${s.label} (${t}) ===\n${s.versions[t] || ""}`).join("\n\n")
      })
      .join("\n\n---\n\n")
    const blob = new Blob([all], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sales-funnel.txt"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Funnel exported!")
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

  const handleSendAll = async () => {
    try {
      const all = stages
        .map((s) => {
          const tone = selectedTone[s.id] || "Balanced"
          return `${s.label} (${tone}): ${s.versions[tone] || ""}`
        })
        .join("\n\n")
      await navigator.clipboard.writeText(all)
      const encoded = encodeURIComponent(all.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  if (stages.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {stages.length} stages · {TONES.length} tone versions each
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
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700" onClick={handleSendAll}>
            <MessageCircle className="size-3" />
            <span className="hidden sm:inline">Send All</span>
          </Button>
        </div>
      </div>

      {/* Funnel stage cards */}
      <div className="relative">
        {stages.map((stage, idx) => {
          const currentText = getCurrentText(stage)
          const tone = selectedTone[stage.id] || "Balanced"
          const key = `${stage.id}-${tone}`
          const isCopied = copiedKey === key

          return (
            <div key={stage.id}>
              {/* Connecting arrow */}
              {idx > 0 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="size-4 text-green-400" />
                </div>
              )}

              <Card className="overflow-hidden border-green-200 bg-green-50/30">
                <CardHeader className="py-2.5 border-b border-green-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{stage.icon}</span>
                      <div>
                        <CardTitle className="text-sm text-green-700">{stage.label}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
                      </div>
                    </div>
                    {/* Tone pills */}
                    <div className="flex gap-1">
                      {TONES.map((t) => {
                        const active = (selectedTone[stage.id] || "Balanced") === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTone((prev) => ({ ...prev, [stage.id]: t }))}
                            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                              active
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
                  <Textarea readOnly value={currentText} className="min-h-[60px] resize-none text-sm" />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCopyStage(key, currentText)}
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
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  </div>
                  {currentText && (
                    <details className="group">
                      <summary className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground py-0.5">
                        <TrendingUp className="size-2.5" />
                        Virality score
                      </summary>
                      <div className="pt-1">
                        <WhatsAppViralityScore content={currentText} compact allowAI />
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Save Campaign */}
      <Card className="border-green-200">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Save className="size-4 text-green-600" />
            Save as Reusable Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="flex gap-2">
            <Input
              placeholder="Campaign name (e.g. 'New Product Launch')"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="text-sm"
              disabled={saving}
            />
            <Button
              size="sm"
              onClick={handleSaveCampaign}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span className="hidden sm:inline ml-1">Save</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Campaigns */}
      <div>
        <button
          type="button"
          onClick={() => setShowSaved(!showSaved)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="size-3" />
          {showSaved ? "Hide" : "Show"} saved campaigns
        </button>

        {showSaved && (
          <div className="mt-2 space-y-1">
            {loadingCampaigns ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : savedCampaigns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved campaigns yet.</p>
            ) : (
              savedCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.createdAt && typeof c.createdAt === "object" && "toDate" in c.createdAt
                        ? (c.createdAt as { toDate: () => Date }).toDate().toLocaleDateString()
                        : ""}
                      {" "}· {Object.keys(c.stages || {}).length} stages
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => handleLoadCampaign(c)}
                  >
                    <FolderOpen className="size-3 mr-1" />
                    Load
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
