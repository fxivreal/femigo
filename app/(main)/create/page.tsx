"use client"

import { useState, useEffect } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { goalInstructions, type ContentGoal } from "@/lib/prompts"
import type { ContentAnalysis, InsightCluster } from "@/lib/analysis-types"
import type { CoverageResult } from "@/lib/coverage"
import { generationModes } from "@/lib/generation-modes"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, FileText, Loader2, X, Link, Play, File as FileIcon, Check, Target, RefreshCw } from "lucide-react"
import { GenerationProgress } from "@/components/generation-progress"
import { ContentActions } from "@/components/content-actions"
import { AnalysisDashboard } from "@/components/analysis-dashboard"

const inputTabs = [
  { id: "text", label: "Text", icon: FileText },
  { id: "article", label: "Article URL", icon: Link },
  { id: "youtube", label: "YouTube URL", icon: Play },
  { id: "pdf", label: "PDF URL", icon: FileIcon },
]

const modeList = Object.values(generationModes)

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
}

type PlatformStatus = "idle" | "generating" | "done" | "error"

export default function CreatePage() {
  const { user } = useAuth()
  const [inputTab, setInputTab] = useState<"text" | "article" | "youtube" | "pdf">("text")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [selectedMode, setSelectedMode] = useState<string>("quick")
  const [generating, setGenerating] = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})
  const [generatedResults, setGeneratedResults] = useState<Record<string, string[]>>({})
  const [showResults, setShowResults] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [startedPlatforms, setStartedPlatforms] = useState<Set<string>>(new Set())
  const [completedPlatforms, setCompletedPlatforms] = useState<Set<string>>(new Set())
  const [errorPlatforms, setErrorPlatforms] = useState<Set<string>>(new Set())

  const [goal, setGoal] = useState<string>("")
  const [brandVoice, setBrandVoice] = useState<{
    tone?: string
    audience?: string
    keywords?: string
    avoidKeywords?: string
  } | null>(null)

  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [coverage, setCoverage] = useState<CoverageResult | null>(null)
  const [clusters, setClusters] = useState<InsightCluster[] | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)

  const [selectedAssetTab, setSelectedAssetTab] = useState<Record<string, number>>({})

  const modeConfig = generationModes[selectedMode]

  // Load brand voice from Firestore on mount
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

  const setPlatformResult = (platform: string, content: string, assetIndex: number) => {
    setGeneratedResults((prev) => {
      const existing = prev[platform] || []
      const next = [...existing]
      next[assetIndex] = content
      return { ...prev, [platform]: next }
    })
  }

  const handleTabChange = (tab: "text" | "article" | "youtube" | "pdf") => {
    setInputTab(tab)
    setUrl("")
    setExtractedTitle("")
  }

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL.")
      return
    }
    setExtracting(true)
    setExtractedTitle("")
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: inputTab, url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to extract content.")
        return
      }
      setExtractedTitle(data.title || "")
      setContent(data.content || "")
      toast.success("Content extracted successfully!")
    } catch {
      toast.error("Failed to extract content. Check the URL and try again.")
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error("Please enter or extract some content first.")
      return
    }
    if (!user) return

    const targets = modeConfig.platforms

    setGenerating(true)
    setShowResults(false)
    setShowProgress(true)
    setStartedPlatforms(new Set())
    setCompletedPlatforms(new Set())
    setErrorPlatforms(new Set())
    setGeneratedResults({})
    setAnalysis(null)
    setCoverage(null)
    setClusters(null)
    setSelectedCluster(null)

    const statuses: Record<string, PlatformStatus> = {}
    targets.forEach((p) => (statuses[p] = "generating"))
    setPlatformStatuses(statuses)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          mode: selectedMode,
          goal: goal || undefined,
          brandVoice: brandVoice || undefined,
          analysis: analysis || undefined,
          clusterId: selectedCluster || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error("Generation failed")
      }

      const contentType = res.headers.get("Content-Type") || ""

      if (!contentType.includes("text/plain")) {
        const data = await res.json()
        const updatedStatuses = { ...statuses }
        const resultsMap: Record<string, string[]> = {}
        let hasContent = false

        for (const result of data.results as { platform: string; content: string; error?: string }[]) {
          if (result.error) {
            updatedStatuses[result.platform] = "error"
            toast.error(`Failed to generate ${result.platform} content.`)
            continue
          }
          if (!result.content) {
            updatedStatuses[result.platform] = "idle"
            continue
          }
          if (!resultsMap[result.platform]) resultsMap[result.platform] = []
          resultsMap[result.platform].push(result.content)
          updatedStatuses[result.platform] = "done"
          hasContent = true
        }

        setPlatformStatuses((prev) => ({ ...prev, ...updatedStatuses }))
        setGeneratedResults(resultsMap)
        setShowProgress(false)
        setShowResults(true)

        if (hasContent) {
          toast.success("Content generated successfully!")
        } else {
          toast.error("Generation failed. Check your API key and billing.")
        }

        saveToFirestore(resultsMap)
        return
      }

      // Stream mode
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      const resultsMap: Record<string, string[]> = {}
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }

          switch (event.type) {
            case "start":
              if (event.step === "analyzing") {
                setCompletedPlatforms((prev) => new Set([...prev, "analyzing"]))
              } else if (event.platform) {
                setStartedPlatforms((prev) => new Set([...prev, event.platform as string]))
              }
              break

            case "analysis_complete":
              if (event.analysis) {
                setAnalysis(event.analysis as ContentAnalysis)
              }
              break

            case "clusters":
              if (event.clusters) {
                const cs = event.clusters as InsightCluster[]
                setClusters(cs)
                if (cs.length > 0) setSelectedCluster(cs[0].id)
              }
              break

            case "coverage":
              setCoverage({
                totalInsights: event.totalInsights as number,
                usedInsights: event.usedInsights as number,
                coverageScore: event.coverageScore as number,
                perPlatform: event.perPlatform as Record<string, { used: number; score: number }>,
              })
              break

            case "result":
              if (event.error) {
                setErrorPlatforms((prev) => new Set([...prev, event.platform as string]))
                toast.error(`Failed to generate ${event.platform} content.`)
              } else if (event.content) {
                const p = event.platform as string
                const ai = event.assetIndex as number
                if (!resultsMap[p]) resultsMap[p] = []
                resultsMap[p][ai] = event.content as string
                setPlatformResult(p, event.content as string, ai)
                setCompletedPlatforms((prev) => new Set([...prev, p]))
                hasContent = true
              }
              break

            case "error":
              toast.error(event.message as string || "Generation failed")
              break
          }
        }
      }

      setShowProgress(false)
      setShowResults(true)

      const updatedStatuses: Record<string, PlatformStatus> = {}
      for (const p of targets) {
        if (errorPlatforms.has(p)) {
          updatedStatuses[p] = "error"
        } else if (resultsMap[p] && resultsMap[p].some((c) => c)) {
          updatedStatuses[p] = "done"
        }
      }
      setPlatformStatuses((prev) => ({ ...prev, ...updatedStatuses }))

      if (hasContent) {
        toast.success("Content generated successfully!")
      } else {
        toast.error("Generation failed. Check your API key and billing.")
      }

      saveToFirestore(resultsMap)
    } catch {
      toast.error("Failed to generate content. Please try again.")
      setPlatformStatuses({})
      setShowProgress(false)
    } finally {
      setGenerating(false)
    }
  }

  const saveToFirestore = async (results: Record<string, string[]> | { platform: string; content: string; error?: string }[]) => {
    if (!user) return
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      const db = await getDbInstance()
      const sourceData: Record<string, unknown> = {
        userId: user.uid,
        content: content.trim(),
        mode: selectedMode,
        sourceType: inputTab,
        goal: goal || null,
        createdAt: serverTimestamp(),
      }
      if (inputTab !== "text") {
        sourceData.sourceUrl = url.trim()
        if (extractedTitle) sourceData.sourceTitle = extractedTitle
      }

      if (analysis) {
        sourceData.analysis = analysis
      }

      const sourceRef = await addDoc(collection(db, "contentSources"), sourceData)

      const items = Array.isArray(results)
        ? results.filter((r) => r.content && !r.error)
        : Object.entries(results).flatMap(([platform, contents]) =>
            contents.filter((c) => c).map((content) => ({ platform, content }))
          )

      const genResults = await Promise.allSettled(
        items.map((r) =>
          addDoc(collection(db, "generatedContent"), {
            userId: user.uid,
            sourceId: sourceRef.id,
            platform: r.platform,
            content: r.content,
            createdAt: serverTimestamp(),
          })
        )
      )

      if (genResults.some((r) => r.status === "fulfilled")) {
        const { updateUserMetrics } = await import("@/lib/metrics")
        await updateUserMetrics(user.uid, modeConfig.platforms)
      }
    } catch {
      // Silent
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-heading mb-1">Create</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Paste content then choose a generation mode to produce platform-specific posts.
      </p>

      {/* Input Type Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-6">
        {inputTabs.map((tab) => {
          const Icon = tab.icon
          const active = inputTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as "text" | "article" | "youtube" | "pdf")}
              className={`flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {inputTab === "text" ? "Content Source" : inputTab === "article" ? "Article URL" : inputTab === "youtube" ? "YouTube URL" : "PDF URL"}
          </CardTitle>
          <CardDescription>
            {inputTab === "text"
              ? "Paste your blog post, article, newsletter, or transcript."
              : inputTab === "article"
              ? "Enter a blog or article URL to extract its content."
              : inputTab === "youtube"
              ? "Paste any YouTube video link to extract its transcript."
              : "Enter a PDF URL to extract its text content."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(inputTab === "article" || inputTab === "youtube" || inputTab === "pdf") && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    inputTab === "article"
                      ? "https://example.com/article"
                      : inputTab === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://example.com/document.pdf"
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleExtract() }}
                />
                <Button
                  onClick={handleExtract}
                  disabled={extracting || !url.trim()}
                  className="bg-primary hover:bg-primary/80 text-white shrink-0"
                >
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Extract"
                  )}
                </Button>
              </div>
              {inputTab === "youtube" && (
                <p className="text-xs text-muted-foreground">
                  Works with youtube.com/watch?v=..., youtu.be/..., and other YouTube URL formats.
                </p>
              )}
              {inputTab === "pdf" && (
                <p className="text-xs text-muted-foreground">
                  Direct PDF URLs only (ending in .pdf). Works best with text-based PDFs, not scanned documents.
                </p>
              )}
              {extractedTitle && (
                <div className="rounded-lg bg-muted/50 border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Extracted title</p>
                  <p className="text-sm font-medium">{extractedTitle}</p>
                </div>
              )}
            </>
          )}
          <Textarea
            placeholder={
              inputTab === "text"
                ? "Paste your content here..."
                : extracting
                ? "Extracting content..."
                : "Extracted content will appear here. You can edit it before generating."
            }
            disabled={extracting}
            className="min-h-[250px] sm:min-h-[350px] resize-y focus-visible:ring-primary/20"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Generation Mode Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generation Mode</CardTitle>
          <CardDescription>Choose how many assets to generate.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modeList.map((mode) => {
              const active = selectedMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  disabled={generating}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                  } ${generating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {mode.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mode.assets.map((a) => (
                      <span
                        key={a.platform}
                        className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                      >
                        {platformLabels[a.platform] || a.platform} ×{a.count}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
              ([key, instruction]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoal(key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    goal === key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={instruction.split("\n")[0]}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              )
            )}
          </div>
          {goal && (
            <p className="text-xs text-muted-foreground mt-2 ml-0.5">
              {goalInstructions[goal as ContentGoal]}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Insight Clusters */}
      {clusters && clusters.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="size-4" />
              Content Focus
            </CardTitle>
            <CardDescription>Pick a cluster to generate content from, or use all insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCluster(null)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  !selectedCluster
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Insights
              </button>
              {clusters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCluster(c.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    selectedCluster === c.id
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={c.description}
                >
                  {c.title}
                </button>
              ))}
            </div>
            {selectedCluster && (
              <p className="text-xs text-muted-foreground mt-2 ml-0.5">
                {clusters.find((c) => c.id === selectedCluster)?.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={handleGenerate}
          disabled={generating || !content.trim()}
          size="lg"
          className="bg-primary hover:bg-primary/80 text-white"
        >
          {generating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          {generating ? "Generating..." : `${modeConfig.label} (${modeConfig.totalAssets} assets)`}
        </Button>
        {!generating && (
          <span className="text-xs text-muted-foreground">
            {modeConfig.totalAssets} {modeConfig.platforms.length} platforms
          </span>
        )}
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="mb-6">
          <GenerationProgress
            platforms={modeConfig.platforms}
            startedPlatforms={startedPlatforms}
            completedPlatforms={completedPlatforms}
            errors={errorPlatforms}
          />
        </div>
      )}

      {/* Analysis Dashboard */}
      {showResults && analysis && (
        <div className="mb-6">
          <AnalysisDashboard
            analysis={analysis}
            clusters={clusters}
            coverage={coverage}
            totalAssets={modeConfig.totalAssets}
          />
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-slide-up">
          {modeConfig.platforms.map((platformId) => {
            const results = generatedResults[platformId] || []
            const assets = results.filter((r) => r)
            if (assets.length === 0) return null
            const currentTab = selectedAssetTab[platformId] || 0
            const result = assets[currentTab] || ""
            const status = platformStatuses[platformId]

            return (
              <Card key={platformId} size="sm" className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{platformLabels[platformId] || platformId}</CardTitle>
                    {assets.length > 1 && (
                      <div className="flex gap-0.5 ml-1">
                        {assets.map((_, vi) => (
                          <button
                            key={vi}
                            type="button"
                            onClick={() =>
                              setSelectedAssetTab((prev) => ({
                                ...prev,
                                [platformId]: vi,
                              }))
                            }
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                              currentTab === vi
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            Run {vi + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {status === "generating" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                  {status === "done" && (
                    <ContentActions
                      content={result}
                      platformLabel={platformLabels[platformId] || platformId}
                    />
                  )}
                  {status === "error" && (
                    <span className="text-xs text-destructive">Failed</span>
                  )}
                </CardHeader>
                {result && (
                  <CardContent className="pb-3">
                    <Textarea
                      readOnly
                      value={result}
                      className="min-h-[100px] resize-none text-sm"
                    />
                  </CardContent>
                )}
                {status === "generating" && !result && (
                  <CardContent className="pb-3">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="space-y-2">
                        <div className="h-3 w-full animate-skeleton rounded bg-foreground/5" />
                        <div className="h-3 w-4/5 animate-skeleton rounded bg-foreground/5" />
                        <div className="h-3 w-3/5 animate-skeleton rounded bg-foreground/5" />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
