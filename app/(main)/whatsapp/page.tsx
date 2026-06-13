"use client"

import { useState, useEffect } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { goalInstructions, audienceModes, angles, type ContentGoal } from "@/lib/prompts"
import { whatsappContentTypes, type WhatsAppType } from "@/lib/prompts/whatsapp"
import type { ContentAnalysis } from "@/lib/analysis-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, Target, Loader2, Check, MessageCircle, Send } from "lucide-react"
import { ContentInput } from "@/components/content-input"
import { WhatsAppSuiteCard } from "@/components/whatsapp-suite-card"
import { WhatsAppStatusViewer } from "@/components/whatsapp-status-viewer"
import { WhatsAppBroadcastViewer } from "@/components/whatsapp-broadcast-viewer"
import { WhatsAppFunnelViewer } from "@/components/whatsapp-funnel-viewer"
import { WhatsAppFollowUpViewer } from "@/components/whatsapp-followup-viewer"
import { QuickReplySection } from "@/components/quick-reply-section"
import { PublishButton } from "@/components/publish-button"

type GenerationStatus = Record<string, "idle" | "generating" | "done" | "error">

const totalItems = (selected: string[], statusCount: number) =>
  whatsappContentTypes
    .filter((t) => selected.includes(t.id))
    .reduce((sum, t) => sum + (t.id === "status" ? statusCount : t.count), 0)

export default function WhatsAppPage() {
  const { user } = useAuth()
  const [sourceContent, setSourceContent] = useState("")
  const [sourceTitle, setSourceTitle] = useState<string | undefined>()
  const [sourceType, setSourceType] = useState<string | undefined>()
  const [sourceUrl, setSourceUrl] = useState<string | undefined>()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "status", "promotional", "quick-reply", "broadcast", "follow-up",
  ])
  const [generating, setGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [statuses, setStatuses] = useState<GenerationStatus>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [goal, setGoal] = useState<string>("")
  const [audience, setAudience] = useState<string>("default")
  const [angle, setAngle] = useState<string>("educational")
  const [brandVoice, setBrandVoice] = useState<Record<string, string> | null>(null)
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [statusCount, setStatusCount] = useState<number>(5)

  // Load brand voice
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore")
        const db = await getDbInstance()
        const snap = await getDoc(doc(db, "users", user.uid))
        const data = snap.data()
        if (data?.brandVoice) {
          setBrandVoice(data.brandVoice)
        }
      } catch {
        // silent
      }
    })()
  }, [user])

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleContentReady = (content: string, title?: string, srcType?: string, srcUrl?: string) => {
    setSourceContent(content)
    setSourceTitle(title)
    setSourceType(srcType)
    setSourceUrl(srcUrl)
  }

  const handleGenerate = async () => {
    if (!sourceContent.trim()) {
      toast.error("Please enter some content first.")
      return
    }
    if (!user) return
    if (selectedTypes.length === 0) {
      toast.error("Select at least one WhatsApp content type.")
      return
    }

    setGenerating(true)
    setShowResults(false)
    setShowProgress(true)
    setResults({})
    setAnalysis(null)

    const initialStatuses: GenerationStatus = {}
    selectedTypes.forEach((t) => (initialStatuses[t] = "generating"))
    setStatuses(initialStatuses)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: sourceContent.trim(),
          whatsappSuite: true,
          types: selectedTypes,
          goal: goal || undefined,
          brandVoice: brandVoice || undefined,
          audience: audience !== "default" ? audience : undefined,
          angle: audience === "nigerian" ? angle : undefined,
          statusCount: selectedTypes.includes("status") ? statusCount : undefined,
        }),
      })

      if (!res.ok) {
        throw new Error("Generation failed")
      }

      const contentType = res.headers.get("Content-Type") || ""

      if (!contentType.includes("text/plain")) {
        const data = await res.json()
        const updatedStatuses = { ...initialStatuses }
        const resultsMap: Record<string, string> = {}

        for (const result of data.results as { platform: string; content?: string; error?: string }[]) {
          if (result.error) {
            const type = result.platform.replace("whatsapp_", "")
            updatedStatuses[type] = "error"
            continue
          }
          if (!result.content) continue
          const type = result.platform.replace("whatsapp_", "")
          resultsMap[type] = result.content
          updatedStatuses[type] = "done"
        }

        setStatuses(updatedStatuses)
        setResults(resultsMap)
        setShowProgress(false)
        setShowResults(true)
        toast.success("WhatsApp content generated!")
        saveToFirestore(resultsMap)
        return
      }

      // Stream mode
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      const resultsMap: Record<string, string> = {}

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
            switch (event.type) {
              case "analysis_complete":
                if (event.analysis) {
                  setAnalysis(event.analysis as ContentAnalysis)
                }
                break
              case "result":
                if (event.error) {
                  const type = (event.whatsappType as string) || (event.platform as string).replace("whatsapp_", "")
                  setStatuses((prev) => ({ ...prev, [type]: "error" }))
                } else if (event.content) {
                  const type = (event.whatsappType as string) || (event.platform as string).replace("whatsapp_", "")
                  resultsMap[type] = event.content as string
                  setResults((prev) => ({ ...prev, [type]: event.content as string }))
                  setStatuses((prev) => ({ ...prev, [type]: "done" }))
                }
                break
              case "error":
                toast.error(event.message as string || "Generation failed")
                break
            }
          } catch {
            // skip
          }
        }
      }

      setShowProgress(false)
      setShowResults(true)
      toast.success("WhatsApp content generated!")
      saveToFirestore(resultsMap)
    } catch {
      toast.error("Failed to generate content. Please try again.")
      setStatuses({})
    } finally {
      setGenerating(false)
    }
  }

  const saveToFirestore = async (genResults: Record<string, string>) => {
    if (!user) return
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      const db = await getDbInstance()

      const sourceRef = await addDoc(collection(db, "contentSources"), {
        userId: user.uid,
        content: sourceContent.trim(),
        type: "whatsapp-suite",
        selectedTypes,
        sourceType: sourceType || "text",
        sourceUrl: sourceUrl || null,
        sourceTitle: sourceTitle || null,
        goal: goal || null,
        audience: audience !== "default" ? audience : null,
        angle: audience === "nigerian" ? angle : null,
        analysis: analysis || null,
        createdAt: serverTimestamp(),
      })

      const items = Object.entries(genResults)
        .filter(([, c]) => c)
        .map(([type, content]) => ({
          userId: user.uid,
          sourceId: sourceRef.id,
          platform: `whatsapp_${type}`,
          whatsappType: type,
          content,
          createdAt: serverTimestamp(),
        }))

      if (items.length > 0) {
        const genRef = collection(db, "generatedContent")
        await Promise.allSettled(items.map((item) => addDoc(genRef, item)))

        const { updateUserMetrics } = await import("@/lib/metrics")
        await updateUserMetrics(user.uid, items.map((i) => i.platform))
      }
    } catch {
      // silent
    }
  }

  const typeIds = whatsappContentTypes.map((t) => t.id)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-1">
        <MessageCircle className="size-6 text-green-600" />
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">WhatsApp Suite</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Generate WhatsApp-optimized content for your customers and audience.
      </p>

      {/* Content Input */}
      <div className="mb-6">
        <ContentInput onContentReady={handleContentReady} />
      </div>

      {/* Content Type Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Content Types</CardTitle>
          <CardDescription>
            Choose which WhatsApp content types to generate.
            {selectedTypes.length > 0 && (
              <span className="text-muted-foreground">
                {" "}— {totalItems(selectedTypes, statusCount)} items total
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whatsappContentTypes.map((ct) => {
              const active = selectedTypes.includes(ct.id)
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => toggleType(ct.id)}
                  disabled={generating}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-green-300 bg-green-50/50 shadow-sm ring-1 ring-green-200"
                      : "border-border bg-card hover:border-foreground/20"
                  } ${generating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-5 shrink-0 rounded border flex items-center justify-center mt-0.5 ${
                      active ? "bg-green-600 border-green-600" : "border-muted-foreground/30"
                    }`}>
                      {active && <Check className="size-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ct.icon}</span>
                        <p className={`text-sm font-semibold ${active ? "text-green-700" : "text-foreground"}`}>
                          {ct.label}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ct.description}</p>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                        {ct.count} {ct.count === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Count Selector (only when Status is selected) */}
      {selectedTypes.includes("status") && (
        <Card className="mb-6 border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Count</CardTitle>
            <CardDescription>How many statuses should we generate?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStatusCount(n)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    statusCount === n
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {n} statuses
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {statusCount === 5 && "Best for one key insight — tight, focused story."}
              {statusCount === 10 && "Two insights — broader coverage with progression."}
              {statusCount === 20 && "Multiple insights — detailed, multi-angle sequence."}
              {statusCount === 30 && "Maximum depth — covers most insights from your content."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audience */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audience</CardTitle>
          <CardDescription>Choose who this content is for.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {audienceModes.map((m) => {
              const active = audience === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setAudience(m.id)
                    if (m.id === "nigerian" && !angle) setAngle("educational")
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content Angle (Nigerian only) */}
      {audience === "nigerian" && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Content Angle</CardTitle>
            <CardDescription>How should this content be framed?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {angles.map((a) => {
                const active = angle === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAngle(a.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Goal */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4" />
            Content Goal
          </CardTitle>
          <CardDescription>What should this content achieve?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGoal("")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                !goal
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              None
            </button>
            {(Object.entries(goalInstructions) as [ContentGoal, string][]).map(
              ([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoal(key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    goal === key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={handleGenerate}
          disabled={generating || !sourceContent.trim() || selectedTypes.length === 0}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {generating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          {generating ? "Generating..." : `Generate WhatsApp Content (${totalItems(selectedTypes, statusCount)} items)`}
        </Button>
        {!generating && (
          <span className="text-xs text-muted-foreground">
            {selectedTypes.length} types
          </span>
        )}
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="mb-6">
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="size-4 animate-spin text-green-600" />
                <p className="text-sm font-medium text-green-700">Generating WhatsApp content...</p>
              </div>
              <div className="space-y-1.5">
                {selectedTypes.map((type) => {
                  const ct = whatsappContentTypes.find((t) => t.id === type)
                  const s = statuses[type]
                  return (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      {s === "done" ? (
                        <Check className="size-3 text-green-600" />
                      ) : s === "error" ? (
                        <span className="size-3 text-destructive font-bold">!</span>
                      ) : (
                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      )}
                      <span className={s === "done" ? "text-green-700" : s === "error" ? "text-destructive" : "text-muted-foreground"}>
                        {ct?.icon} {ct?.label || type}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Publish All */}
      {showResults && Object.keys(results).length > 0 && (
        <div className="mb-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Send className="size-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800 font-medium">
                    Publish all content to WhatsApp
                  </p>
                </div>
                <PublishButton
                  items={Object.entries(results)
                    .filter(([, c]) => c)
                    .map(([type, content]) => ({
                      content,
                      platformType: `whatsapp_${type}`,
                      label: (whatsappContentTypes.find((t) => t.id === type)?.label || type),
                    }))}
                  buttonLabel="Publish All"
                  buttonSize="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-slide-up">
          {whatsappContentTypes
            .filter((ct) => selectedTypes.includes(ct.id))
            .map((ct) => {
              const content = results[ct.id] || ""
              const status = statuses[ct.id] || "idle"
              const isQuickReply = ct.id === "quick-reply"
              const isStatus = ct.id === "status"
              const isBroadcast = ct.id === "broadcast"
              const isSalesFunnel = ct.id === "sales-funnel"
              const isFollowUp = ct.id === "follow-up"

              if (isStatus && status === "done" && content) {
                return (
                  <WhatsAppStatusViewer
                    key={ct.id}
                    content={content}
                    statusCount={statusCount}
                    onRegenerate={handleGenerate}
                  />
                )
              }

              if (isBroadcast && status === "done" && content) {
                return (
                  <WhatsAppBroadcastViewer
                    key={ct.id}
                    content={content}
                    onRegenerate={handleGenerate}
                  />
                )
              }

              if (isSalesFunnel && status === "done" && content) {
                return (
                  <WhatsAppFunnelViewer
                    key={ct.id}
                    content={content}
                    sourceContent={sourceContent}
                    onRegenerate={handleGenerate}
                  />
                )
              }

              if (isFollowUp && status === "done" && content) {
                return (
                  <WhatsAppFollowUpViewer
                    key={ct.id}
                    content={content}
                    onRegenerate={handleGenerate}
                  />
                )
              }

              return (
                <WhatsAppSuiteCard
                  key={ct.id}
                  typeId={ct.id}
                  label={ct.label}
                  icon={ct.icon}
                  content={content}
                  status={status}
                  extra={
                    isQuickReply && status === "done" && content ? (
                      <QuickReplySection
                        sourceContent={sourceContent}
                        analysisJson={analysis ? JSON.stringify(analysis) : null}
                      />
                    ) : undefined
                  }
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
