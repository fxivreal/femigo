"use client"

import { useState, useEffect } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { platformPrompts, platformStyles, goalInstructions, type ContentGoal } from "@/lib/prompts"
import type { ContentAnalysis } from "@/lib/analysis-types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, FileText, Loader2, X, Link, Play, File as FileIcon, Check, ChevronRight, Target, RefreshCw } from "lucide-react"
import { GenerationProgress } from "@/components/generation-progress"
import { ContentActions } from "@/components/content-actions"

const inputTabs = [
  { id: "text", label: "Text", icon: FileText },
  { id: "article", label: "Article URL", icon: Link },
  { id: "youtube", label: "YouTube URL", icon: Play },
  { id: "pdf", label: "PDF URL", icon: FileIcon },
]

type PlatformDef = {
  id: string
  label: string
}

const platforms: PlatformDef[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X (Twitter)" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
]

type PlatformStatus = "idle" | "generating" | "done" | "error"

export default function CreatePage() {
  const { user } = useAuth()
  const [inputTab, setInputTab] = useState<"text" | "article" | "youtube" | "pdf">("text")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})
  const [generatedResults, setGeneratedResults] = useState<Record<string, string[]>>({})
  const [showResults, setShowResults] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [startedPlatforms, setStartedPlatforms] = useState<Set<string>>(new Set())
  const [completedPlatforms, setCompletedPlatforms] = useState<Set<string>>(new Set())
  const [errorPlatforms, setErrorPlatforms] = useState<Set<string>>(new Set())

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [editPromptText, setEditPromptText] = useState("")
  const [platformStylesState, setPlatformStylesState] = useState<Record<string, string>>({})
  const [regenerating, setRegenerating] = useState(false)

  const [goal, setGoal] = useState<string>("")
  const [variations, setVariations] = useState(1)
  const [brandVoice, setBrandVoice] = useState<{
    tone?: string
    audience?: string
    keywords?: string
    avoidKeywords?: string
  } | null>(null)

  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)

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

  // Store results as array per platform (supports variations)
  const setPlatformResult = (platform: string, content: string, variation?: number) => {
    setGeneratedResults((prev) => {
      const existing = prev[platform] || []
      const idx = variation ? variation - 1 : 0
      const next = [...existing]
      next[idx] = content
      return { ...prev, [platform]: next }
    })
  }

  const [selectedVariation, setSelectedVariation] = useState<Record<string, number>>({})

  const getDefaultStyle = (platform: string): string => {
    const styles = platformStyles[platform]
    return styles?.[0]?.id || ""
  }

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((p) => p !== id)
        return next
      }
      setPlatformStylesState((s) => ({ ...s, [id]: getDefaultStyle(id) }))
      return [...prev, id]
    })
  }

  const setStyle = (platform: string, style: string) => {
    setPlatformStylesState((prev) => ({ ...prev, [platform]: style }))
  }

  const selectAllPlatforms = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([])
    } else {
      setSelectedPlatforms(platforms.map((p) => p.id))
    }
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

  const handleGenerate = async (promptOverrides?: Record<string, string>) => {
    if (!content.trim()) {
      toast.error("Please enter or extract some content first.")
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform.")
      return
    }
    if (!user) return

    const targets = promptOverrides ? Object.keys(promptOverrides) : selectedPlatforms

    setGenerating(true)
    setShowResults(false)
    setShowProgress(true)
    setStartedPlatforms(new Set())
    setCompletedPlatforms(new Set())
    setErrorPlatforms(new Set())

    if (!promptOverrides) {
      setGeneratedResults({})
      setAnalysis(null)
    }

    const statuses: Record<string, PlatformStatus> = {}
    targets.forEach((p) => (statuses[p] = "generating"))
    setPlatformStatuses((prev) => ({ ...prev, ...statuses }))

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          platforms: promptOverrides ? Object.keys(promptOverrides) : selectedPlatforms,
          styles: promptOverrides ? undefined : platformStylesState,
          prompts: promptOverrides,
          goal: goal || undefined,
          brandVoice: brandVoice || undefined,
          variations: variations > 1 ? variations : undefined,
          analysis: analysis || undefined,
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
          resultsMap[result.platform] = [result.content]
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

        if (!promptOverrides) {
          saveToFirestore(data.results)
        }
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

            case "result":
              if (event.error) {
                setErrorPlatforms((prev) => new Set([...prev, event.platform as string]))
                toast.error(`Failed to generate ${event.platform} content.`)
              } else if (event.content) {
                const p = event.platform as string
                const v = (event.variation as number) || 1
                if (!resultsMap[p]) resultsMap[p] = []
                resultsMap[p][v - 1] = event.content as string
                setPlatformResult(p, event.content as string, v)
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
        } else if (resultsMap[p]) {
          updatedStatuses[p] = "done"
        }
      }
      setPlatformStatuses((prev) => ({ ...prev, ...updatedStatuses }))

      if (hasContent) {
        toast.success("Content generated successfully!")
      } else {
        toast.error("Generation failed. Check your API key and billing.")
      }

      if (!promptOverrides) {
        saveToFirestore(resultsMap)
      }
    } catch {
      toast.error("Failed to generate content. Please try again.")
      if (!promptOverrides) {
        setPlatformStatuses({})
        setShowProgress(false)
      }
    } finally {
      setGenerating(false)
      setRegenerating(false)
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
        platforms: selectedPlatforms,
        styles: platformStylesState,
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
        : Object.entries(results).map(([platform, contents]) => ({ platform, content: contents[0] || "" })).filter((r) => r.content)

      const genResults = await Promise.allSettled(
        items.map((r) =>
          addDoc(collection(db, "generatedContent"), {
            userId: user.uid,
            sourceId: sourceRef.id,
            platform: r.platform,
            style: platformStylesState[r.platform] || "",
            content: r.content,
            createdAt: serverTimestamp(),
          })
        )
      )

      if (genResults.some((r) => r.status === "fulfilled")) {
        const { updateUserMetrics } = await import("@/lib/metrics")
        await updateUserMetrics(user.uid, selectedPlatforms)
      }
    } catch {
      // Silent
    }
  }

  const handleEditPrompt = (platform: string) => {
    const prompt = platformPrompts[platform]
    setEditPromptText(prompt?.user(content.trim()) || content.trim())
    setEditingPlatform(platform)
  }

  const handleRegenerate = async () => {
    if (!editingPlatform) return
    setRegenerating(true)
    await handleGenerate({ [editingPlatform]: editPromptText })
    setEditingPlatform(null)
    setEditPromptText("")
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-heading mb-1">Create</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Paste content or a URL to generate platform-specific posts.
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
              onClick={() => handleTabChange(tab.id as "text" | "article" | "youtube")}
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

      {/* Platform Selector */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Target Platforms</CardTitle>
              <CardDescription>Select where you want to publish.</CardDescription>
            </div>
            <button
              type="button"
              onClick={selectAllPlatforms}
              className="text-xs font-medium text-primary hover:underline"
            >
              {selectedPlatforms.length === platforms.length ? "Deselect all" : "Select all"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {platforms.map((platform) => {
              const checked = selectedPlatforms.includes(platform.id)
              const status = platformStatuses[platform.id]
              const result = generatedResults[platform.id]
              const styles = platformStyles[platform.id]
              const activeStyle = platformStylesState[platform.id]
              return (
                <div
                  key={platform.id}
                  className={`rounded-xl border transition-all ${
                    checked
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                  } ${generating ? "opacity-50" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => !generating && togglePlatform(platform.id)}
                    disabled={generating}
                    className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{platform.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {status === "generating" && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="size-2.5 animate-spin" />
                            Generating...
                          </span>
                        )}
                        {status === "done" && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                            <Check className="size-2.5" />
                            Done
                          </span>
                        )}
                        {status === "error" && (
                          <span className="text-[10px] text-destructive font-medium">Failed</span>
                        )}
                        {(!status || status === "idle") && checked && (
                          <span className="text-[10px] text-muted-foreground">Selected</span>
                        )}
                      </div>
                    </div>
                    {checked && (
                      <div className="flex items-center justify-center size-5 rounded-full bg-primary text-white shrink-0">
                        <Check className="size-3" />
                      </div>
                    )}
                  </button>

                  {/* Style pills — shown when platform is selected */}
                  {checked && styles && !generating && (
                    <div className="px-3.5 pb-3.5 pt-0 flex flex-wrap gap-1.5 border-t border-primary/10 mt-0">
                      {styles.map((s) => {
                        const isActive = activeStyle === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setStyle(platform.id, s.id)}
                            className={`text-[10px] font-medium px-2 py-1 rounded-full transition-all ${
                              isActive
                                ? "bg-primary text-white shadow-sm"
                                : "bg-primary/5 text-primary hover:bg-primary/10"
                            }`}
                          >
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
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

      {/* Generate Button */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={() => handleGenerate()}
          disabled={generating || !content.trim() || selectedPlatforms.length === 0}
          size="lg"
          className="bg-primary hover:bg-primary/80 text-white"
        >
          {generating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          {generating ? "Generating..." : `Generate (${selectedPlatforms.length})`}
        </Button>
        {selectedPlatforms.length > 0 && !generating && (
          <div className="flex items-center gap-3">
            {/* Variations selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Variations:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVariations(n)}
                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                      variations === n
                        ? "bg-primary/10 text-primary"
                        : "bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="mb-6">
          <GenerationProgress
            platforms={selectedPlatforms}
            startedPlatforms={startedPlatforms}
            completedPlatforms={completedPlatforms}
            errors={errorPlatforms}
          />
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-slide-up">
          {selectedPlatforms.map((platformId) => {
            const platform = platforms.find((p) => p.id === platformId)
            if (!platform) return null
            const results = generatedResults[platformId] || []
            const currentVar = selectedVariation[platformId] || 0
            const result = results[currentVar] || ""
            const status = platformStatuses[platformId]
            if (status === "idle" || !status) return null

            return (
              <Card key={platformId} size="sm" className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{platform.label}</CardTitle>
                    {platformStylesState[platformId] && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {platformStyles[platformId]?.find((s) => s.id === platformStylesState[platformId])?.label}
                      </span>
                    )}
                    {/* Variation tabs */}
                    {results.length > 1 && (
                      <div className="flex gap-0.5 ml-1">
                        {results.map((_, vi) => (
                          <button
                            key={vi}
                            type="button"
                            onClick={() =>
                              setSelectedVariation((prev) => ({
                                ...prev,
                                [platformId]: vi,
                              }))
                            }
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                              currentVar === vi
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            V{vi + 1}
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
                      platformLabel={platform.label}
                      showRegenerate
                      onRegenerate={() => handleEditPrompt(platformId)}
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
                {status === "generating" && (
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

      {/* Edit Prompt Modal */}
      {editingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="text-base font-semibold capitalize">Edit prompt — {editingPlatform}</h2>
              <button
                type="button"
                onClick={() => { setEditingPlatform(null); setEditPromptText("") }}
                className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 pb-2">
              <p className="text-xs text-muted-foreground">
                Edit the instruction for generating content on this platform.
              </p>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3">
              <Textarea
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                className="min-h-[200px] resize-none text-sm focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingPlatform(null); setEditPromptText("") }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating || !editPromptText.trim()}
                className="bg-primary hover:bg-primary/80 text-white"
              >
                {regenerating ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="size-3 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
