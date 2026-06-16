"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDbInstance } from "@/lib/firebase"
import { goalInstructions, audienceModes, angles } from "@/lib/prompts"
import type { ContentAnalysis } from "@/lib/analysis-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Sparkles, Check, Loader2, Copy, Download, Plus, Pencil, Trash2,
  ArrowLeft, MessageCircle, ChevronDown, ChevronUp, Send, LayoutTemplate,
} from "lucide-react"
import { funnelTemplates, followupTemplates, type CampaignTemplate } from "@/lib/prompts/whatsapp/templates"
import { ContentInput } from "@/components/content-input"
import { cn } from "@/lib/utils"
import { PublishButton } from "@/components/publish-button"
import { RenderVideoButton } from "@/components/render-video-button"

// ── Types ──────────────────────────────────────────

interface CampaignConfig {
  status: { enabled: boolean; count: number }
  broadcast: { enabled: boolean }
  "sales-funnel": { enabled: boolean }
  "follow-up": { enabled: boolean }
}

interface CampaignData {
  id?: string
  userId: string
  name: string
  sourceContent: string
  sourceTitle?: string | null
  sourceType?: string | null
  sourceUrl?: string | null
  config: CampaignConfig
  results: Record<string, string>
  goal?: string | null
  audience?: string | null
  angle?: string | null
  createdAt?: { toDate?: () => Date } | string
  updatedAt?: { toDate?: () => Date } | string
}

interface TimelineItem {
  id: string
  day: number
  type: "status" | "broadcast" | "funnel" | "followup"
  label: string
  icon: string
  content: string
  sublabel?: string
}

type ViewMode = "list" | "builder"

const DEFAULT_CONFIG: CampaignConfig = {
  status: { enabled: true, count: 10 },
  broadcast: { enabled: true },
  "sales-funnel": { enabled: true },
  "follow-up": { enabled: true },
}

// ── Parsers ─────────────────────────────────────────

function parseStatusItems(content: string): TimelineItem[] {
  const items: TimelineItem[] = []
  const lines = content.split("\n")
  for (const line of lines) {
    const m = line.match(/^Status\s*(\d+):\s*(.+)/i)
    if (m) {
      items.push({
        id: `status-${m[1]}`,
        day: 1,
        type: "status",
        label: `Status ${m[1]}`,
        icon: "📱",
        content: m[2].trim(),
      })
    }
  }
  return items
}

function parseBroadcastItems(content: string): TimelineItem[] {
  const items: TimelineItem[] = []
  const sections = content.split(/\n(?=#)/)
  for (const section of sections) {
    const header = section.match(/^#(\w+)/)
    if (!header) continue
    const type = header[1]
    const shortM = section.match(/^Short:\s*(.+)/m)
    if (shortM) {
      items.push({
        id: `broadcast-${type}-short`,
        day: 1,
        type: "broadcast",
        label: `${type} (Short)`,
        icon: "📢",
        content: shortM[1].trim(),
        sublabel: type,
      })
    }
  }
  return items
}

function parseFunnelItems(content: string, tone = "Balanced"): TimelineItem[] {
  const items: TimelineItem[] = []
  const stages = content.split(/\n(?=#)/)
  for (const section of stages) {
    const header = section.match(/^#(\w+)/)
    if (!header) continue
    const stage = header[1]
    const tRegex = new RegExp(`${tone}:\\s*([^\\n]+)`)
    const tMatch = section.match(tRegex)
    if (tMatch) {
      items.push({
        id: `funnel-${stage}`,
        day: 2,
        type: "funnel",
        label: stage.charAt(0) + stage.slice(1).toLowerCase(),
        icon: "🔄",
        content: tMatch[1].trim(),
        sublabel: stage,
      })
    }
  }
  return items.map((item, i) => ({ ...item, day: 2 + Math.floor(i / 2) }))
}

function parseFollowUpItems(content: string, tone = "Friendly"): TimelineItem[] {
  const items: TimelineItem[] = []
  const sections = content.split(/\n(?=#)/)
  for (const section of sections) {
    const header = section.match(/^#(\w+)/)
    if (!header) continue
    const type = header[1]
    const tRegex = new RegExp(`${tone}:\\s*\\n([\\s\\S]*?)(?=\\n(?:Friendly|Professional|Sales-Oriented):|\\n#|$)`, "i")
    const tMatch = section.match(tRegex)
    if (tMatch) {
      const varM = tMatch[1].match(/Var\s*\d+:\s*([^\n]+)/)
      if (varM) {
        items.push({
          id: `followup-${type}`,
          day: 5,
          type: "followup",
          label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: "🤝",
          content: varM[1].trim(),
          sublabel: type,
        })
      }
    }
  }
  return items.map((item, i) => ({ ...item, day: 5 + Math.floor(i / 2) }))
}

function buildTimeline(results: Record<string, string>, statusCount: number): TimelineItem[] {
  const items: TimelineItem[] = []

  if (results.status) {
    items.push(...parseStatusItems(results.status))
  }
  if (results.broadcast) {
    items.push(...parseBroadcastItems(results.broadcast))
  }
  if (results["sales-funnel"]) {
    items.push(...parseFunnelItems(results["sales-funnel"]))
  }
  if (results["follow-up"]) {
    items.push(...parseFollowUpItems(results["follow-up"]))
  }

  // Reassign day numbers to spread items across contiguous days
  let day = 1
  let lastType = ""
  for (const item of items) {
    if (item.type !== lastType) {
      if (lastType && item.type === "status") day = 1
      else if (lastType && item.type !== lastType) day += 1
      lastType = item.type
    }
    item.day = day
  }

  return items
}

// ── Component ───────────────────────────────────────

export function CampaignBuilder() {
  const { user } = useAuth()
  const [view, setView] = useState<ViewMode>("list")
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null)

  // Builder state
  const [name, setName] = useState("")
  const [sourceContent, setSourceContent] = useState("")
  const [sourceTitle, setSourceTitle] = useState<string | undefined>()
  const [sourceType, setSourceType] = useState<string | undefined>()
  const [sourceUrl, setSourceUrl] = useState<string | undefined>()
  const [config, setConfig] = useState<CampaignConfig>({ ...DEFAULT_CONFIG })
  const [goal, setGoal] = useState("")
  const [audience, setAudience] = useState("default")
  const [angle, setAngle] = useState("educational")
  const [generating, setGenerating] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [results, setResults] = useState<Record<string, string>>({})
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const applyTemplate = (template: CampaignTemplate) => {
    setGoal(template.goal || "")
    setAudience(template.audience || "default")
    setAngle(template.angle || "educational")
    setConfig({ ...template.config } as CampaignConfig)
    setSourceContent(template.suggestedContent)
    setShowTemplates(false)
    toast.success(`Template "${template.name}" applied!`)
  }

  // Load saved campaigns
  const loadCampaigns = useCallback(async () => {
    if (!user) return
    setLoadingList(true)
    try {
      const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore")
      const db = await getDbInstance()
      const q = query(
        collection(db, "whatsappCampaigns"),
        where("userId", "==", user.uid),
        where("type", "==", "campaign"),
        orderBy("createdAt", "desc")
      )
      const snap = await getDocs(q)
      const list: CampaignData[] = []
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as CampaignData))
      setCampaigns(list)
    } catch {
      // silent
    } finally {
      setLoadingList(false)
    }
  }, [user])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Enter builder mode
  const startNew = () => {
    setEditingCampaign(null)
    setName("")
    setSourceContent("")
    setSourceTitle(undefined)
    setSourceType(undefined)
    setSourceUrl(undefined)
    setConfig({ ...DEFAULT_CONFIG })
    setGoal("")
    setAudience("default")
    setAngle("educational")
    setResults({})
    setTimeline([])
    setView("builder")
  }

  const editCampaign = (c: CampaignData) => {
    setEditingCampaign(c)
    setName(c.name)
    setSourceContent(c.sourceContent)
    setSourceTitle(c.sourceTitle || undefined)
    setSourceType(c.sourceType || undefined)
    setSourceUrl(c.sourceUrl || undefined)
    setConfig({ ...c.config })
    setResults({ ...c.results })
    setTimeline(buildTimeline(c.results, c.config.status.count))
    setGoal(c.goal || "")
    setAudience(c.audience || "default")
    setAngle(c.angle || "educational")
    setView("builder")
  }

  const duplicateCampaign = async (c: CampaignData) => {
    if (!user) return
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      const db = await getDbInstance()
      await addDoc(collection(db, "whatsappCampaigns"), {
        ...c,
        name: `${c.name} (Copy)`,
        userId: user.uid,
        type: "campaign",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success("Campaign duplicated!")
      loadCampaigns()
    } catch {
      toast.error("Failed to duplicate.")
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!user) return
    try {
      const { deleteDoc, doc } = await import("firebase/firestore")
      const db = await getDbInstance()
      await deleteDoc(doc(db, "whatsappCampaigns", id))
      toast.success("Campaign deleted.")
      loadCampaigns()
    } catch {
      toast.error("Failed to delete.")
    }
  }

  const toggleType = (type: keyof CampaignConfig) => {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }))
  }

  const setStatusCount = (n: number) => {
    setConfig((prev) => ({
      ...prev,
      status: { ...prev.status, count: n },
    }))
  }

  const handleContentReady = (content: string, title?: string, srcType?: string, srcUrl?: string) => {
    setSourceContent(content)
    setSourceTitle(title)
    setSourceType(srcType)
    setSourceUrl(srcUrl)
  }

  const handleGenerate = async () => {
    if (!sourceContent.trim()) {
      toast.error("Please enter source content first.")
      return
    }
    if (!user) return

    const selectedTypes = Object.entries(config)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k)

    if (selectedTypes.length === 0) {
      toast.error("Select at least one content type.")
      return
    }

    setGenerating(true)
    setShowProgress(true)
    setResults({})

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: sourceContent.trim(),
          whatsappSuite: true,
          types: selectedTypes,
          goal: goal || undefined,
          audience: audience !== "default" ? audience : undefined,
          angle: audience === "nigerian" ? angle : undefined,
          statusCount: config.status.enabled ? config.status.count : undefined,
        }),
      })

      if (!res.ok) throw new Error("Generation failed")

      const contentType = res.headers.get("Content-Type") || ""
      const resultsMap: Record<string, string> = {}

      if (contentType.includes("text/plain")) {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const event = JSON.parse(line)
              if (event.type === "result" && event.content) {
                const type = (event.whatsappType as string) || (event.platform as string).replace("whatsapp_", "")
                resultsMap[type] = event.content as string
                setResults((prev) => ({ ...prev, [type]: event.content as string }))
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await res.json()
        for (const r of data.results || []) {
          if (r.content) {
            const type = r.platform.replace("whatsapp_", "")
            resultsMap[type] = r.content
          }
        }
      }

      setResults(resultsMap)
      const items = buildTimeline(resultsMap, config.status.count)
      setTimeline(items)
      setShowProgress(false)
      toast.success("Campaign content generated!")
    } catch {
      toast.error("Failed to generate campaign content.")
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    const campaignName = name.trim() || `Campaign ${new Date().toLocaleDateString()}`
    setSaving(true)
    try {
      const { addDoc, updateDoc, doc, collection, serverTimestamp } = await import("firebase/firestore")
      const db = await getDbInstance()
      const base = {
        userId: user.uid,
        name: campaignName,
        sourceContent: sourceContent.trim(),
        sourceTitle: sourceTitle || null,
        sourceType: sourceType || "text",
        sourceUrl: sourceUrl || null,
        config,
        results,
        type: "campaign",
        goal: goal || null,
        audience: audience !== "default" ? audience : null,
        angle: audience === "nigerian" ? angle : null,
        updatedAt: serverTimestamp(),
      }

      if (editingCampaign?.id) {
        await updateDoc(doc(db, "whatsappCampaigns", editingCampaign.id), base)
        toast.success(`Campaign "${campaignName}" updated!`)
      } else {
        await addDoc(collection(db, "whatsappCampaigns"), {
          ...base,
          createdAt: serverTimestamp(),
        })
        toast.success(`Campaign "${campaignName}" saved!`)
      }
      loadCampaigns()
    } catch {
      toast.error("Failed to save campaign.")
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const lines: string[] = [
      `Campaign: ${name || "Untitled"}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "─── Timeline ───",
      "",
    ]
    const sorted = [...timeline].sort((a, b) => a.day - b.day || a.type.localeCompare(b.type))
    let currentDay = 0
    for (const item of sorted) {
      if (item.day !== currentDay) {
        lines.push(`\nDay ${item.day}:`)
        currentDay = item.day
      }
      lines.push(`${item.icon} ${item.label}: ${item.content}`)
    }
    lines.push("", "─── End ───")
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(name || "campaign").replace(/\s+/g, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Campaign exported!")
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* silent */ }
  }

  const selectedCount = Object.values(config).filter((v) => v.enabled).length

  // ── List View ──
  if (view === "list") {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-heading">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build and manage multi-asset WhatsApp campaigns
            </p>
          </div>
          <Button onClick={startNew} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="size-4 mr-1" />
            New Campaign
          </Button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageCircle className="size-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create your first multi-asset campaign to get started.
              </p>
              <Button onClick={startNew} variant="outline" className="mt-4">
                <Plus className="size-4 mr-1" />
                New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const typeCount = Object.values(c.config || {}).filter((v) => v?.enabled).length
              const totalItems = (c.config?.status?.enabled ? c.config.status.count : 0) +
                (c.config?.broadcast?.enabled ? 1 : 0) +
                (c.config?.["sales-funnel"]?.enabled ? 6 : 0) +
                (c.config?.["follow-up"]?.enabled ? 6 : 0)

              return (
                <Card key={c.id} className="hover:border-green-200 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{typeCount} types · {totalItems} items</span>
                          <span>
                            {c.createdAt && typeof c.createdAt === "object" && "toDate" in c.createdAt
                              ? (c.createdAt as { toDate: () => Date }).toDate().toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => editCampaign(c)}>
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => duplicateCampaign(c)}>
                          <Copy className="size-3" />
                          Duplicate
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => c.id && deleteCampaign(c.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Builder View ──

  const afterGenerate = timeline.length > 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setView("list")}>
          <ArrowLeft className="size-3 mr-1" />
          Back
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-heading">
          {editingCampaign ? "Edit Campaign" : "New Campaign"}
        </h1>
      </div>

      {/* Templates */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutTemplate className="size-3.5" />
          {showTemplates ? "Hide templates" : "Start from a template"}
        </button>
        {showTemplates && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Funnel Templates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {funnelTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Follow-up Templates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {followupTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Name */}
      <Input
        placeholder="Campaign name (e.g. 'Cash Flow Masterclass')"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-6 font-medium text-base"
      />

      {/* Content Input */}
      <div className="mb-6">
        <ContentInput onContentReady={handleContentReady} />
      </div>

      {/* Type Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign Assets</CardTitle>
          <CardDescription>
            Choose which content types to include. {selectedCount} types selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TypeToggle
              icon="📱"
              label="Status Series"
              description="Ephemeral story posts"
              enabled={config.status.enabled}
              onToggle={() => toggleType("status")}
              extra={
                config.status.enabled && (
                  <div className="flex gap-1 mt-2">
                    {[5, 10, 20, 30].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStatusCount(n) }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          config.status.count === n
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )
              }
            />
            <TypeToggle
              icon="📢"
              label="Broadcast"
              description="4 types × 3 versions"
              enabled={config.broadcast.enabled}
              onToggle={() => toggleType("broadcast")}
            />
            <TypeToggle
              icon="🔄"
              label="Sales Funnel"
              description="6 stages × 3 tones"
              enabled={config["sales-funnel"].enabled}
              onToggle={() => toggleType("sales-funnel")}
            />
            <TypeToggle
              icon="🤝"
              label="Follow-ups"
              description="6 types × 3 tones × 3 variations"
              enabled={config["follow-up"].enabled}
              onToggle={() => toggleType("follow-up")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audience & Goal (compact row) */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Audience</p>
              <div className="flex flex-wrap gap-1">
                {audienceModes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setAudience(m.id); if (m.id === "nigerian") setAngle("educational") }}
                    className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      audience === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Goal</p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setGoal("")}
                  className={`text-[10px] font-medium px-2 py-1 rounded-full ${!goal ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                >
                  None
                </button>
                {(Object.entries(goalInstructions) as [string, string][]).map(([key]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGoal(key)}
                    className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      goal === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={handleGenerate}
          disabled={generating || !sourceContent.trim() || selectedCount === 0}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {generating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          {generating ? "Generating..." : afterGenerate ? "Regenerate" : "Generate Campaign"}
        </Button>
      </div>

      {/* Progress */}
      {showProgress && (
        <Card className="mb-6 border-green-200 bg-green-50/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-green-600" />
              <p className="text-sm text-green-700">Generating campaign assets...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {afterGenerate && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Campaign Timeline</h2>
            <div className="flex gap-1">
              <RenderVideoButton
                title={name || "Campaign"}
                subtitle={timeline[0]?.content?.slice(0, 100)}
                label="Render Video"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
              />
              <PublishButton
                items={timeline.map((t) => ({
                  content: t.content,
                  platformType: t.type,
                  label: t.label,
                }))}
                buttonLabel="Publish Campaign"
                buttonSize="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
              />
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleExport}>
                <Download className="size-3" />
                Export
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-green-200 rounded-full" />

            {/* Group by day */}
            {Array.from(new Set(timeline.map((t) => t.day)))
              .sort((a, b) => a - b)
              .map((day) => {
                const dayItems = timeline.filter((t) => t.day === day)
                const isExpanded = expandedDay === day
                const visibleItems = isExpanded ? dayItems : dayItems.slice(0, 3)

                return (
                  <div key={day} className="ml-0 mb-4">
                    {/* Day header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-6 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 z-10">
                        {day}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Day {day} · {dayItems.length} {dayItems.length === 1 ? "asset" : "assets"}
                      </span>
                      {dayItems.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDay(isExpanded ? null : day)}
                          className="text-[10px] text-green-600 hover:text-green-700 flex items-center gap-0.5"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {isExpanded ? "Less" : `${dayItems.length - 3} more`}
                        </button>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-1.5 ml-8">
                      {visibleItems.map((item) => {
                        const isCopied = copiedId === item.id
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-lg border p-2.5 transition-all group",
                              item.type === "status" && "border-blue-200 bg-blue-50/30",
                              item.type === "broadcast" && "border-purple-200 bg-purple-50/30",
                              item.type === "funnel" && "border-orange-200 bg-orange-50/30",
                              item.type === "followup" && "border-teal-200 bg-teal-50/30",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-base leading-none mt-0.5">{item.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.content, item.id)}
                                    className={cn(
                                      "text-[10px] flex items-center gap-0.5 shrink-0",
                                      isCopied ? "text-green-600" : "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    )}
                                  >
                                    {isCopied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                                    {isCopied ? "Copied" : "Copy"}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.content}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Save */}
      {afterGenerate && (
        <Card className="border-green-200 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Campaign name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                  disabled={saving}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span className="ml-1">{editingCampaign ? "Update" : "Save"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────

function TypeToggle({
  icon,
  label,
  description,
  enabled,
  onToggle,
  extra,
}: {
  icon: string
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  extra?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-xl border p-3 text-left transition-all ${
        enabled
          ? "border-green-300 bg-green-50/50 shadow-sm ring-1 ring-green-200"
          : "border-border bg-card hover:border-foreground/20"
      } cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`size-5 shrink-0 rounded border flex items-center justify-center mt-0.5 ${
          enabled ? "bg-green-600 border-green-600" : "border-muted-foreground/30"
        }`}>
          {enabled && <Check className="size-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <p className={`text-sm font-semibold ${enabled ? "text-green-700" : "text-foreground"}`}>{label}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {extra}
        </div>
      </div>
    </button>
  )
}
