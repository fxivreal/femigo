"use client"

import { useState } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { platformPrompts } from "@/lib/prompts"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, FileText, Loader2, Copy, PenLine, X, Link, Play, Check, ChevronRight, ArrowLeft } from "lucide-react"
import { GenerationProgress } from "@/components/generation-progress"

const inputTabs = [
  { id: "text", label: "Text", icon: FileText },
  { id: "article", label: "Article URL", icon: Link },
  { id: "youtube", label: "YouTube URL", icon: Play },
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
  const [inputTab, setInputTab] = useState<"text" | "article" | "youtube">("text")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})
  const [generatedResults, setGeneratedResults] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [startedPlatforms, setStartedPlatforms] = useState<Set<string>>(new Set())
  const [completedPlatforms, setCompletedPlatforms] = useState<Set<string>>(new Set())
  const [errorPlatforms, setErrorPlatforms] = useState<Set<string>>(new Set())

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [editPromptText, setEditPromptText] = useState("")
  const [regenerating, setRegenerating] = useState(false)

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const selectAllPlatforms = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([])
    } else {
      setSelectedPlatforms(platforms.map((p) => p.id))
    }
  }

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} content copied!`)
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleTabChange = (tab: "text" | "article" | "youtube") => {
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
          prompts: promptOverrides,
        }),
      })

      if (!res.ok) {
        throw new Error("Generation failed")
      }

      const contentType = res.headers.get("Content-Type") || ""

      if (!contentType.includes("text/plain")) {
        const data = await res.json()
        const updatedStatuses = { ...statuses }
        const resultsMap: Record<string, string> = promptOverrides ? { ...generatedResults } : {}
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
          resultsMap[result.platform] = result.content
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
      const resultsMap: Record<string, string> = {}
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

            case "result":
              if (event.error) {
                setErrorPlatforms((prev) => new Set([...prev, event.platform as string]))
                toast.error(`Failed to generate ${event.platform} content.`)
              } else if (event.content) {
                const p = event.platform as string
                resultsMap[p] = event.content as string
                setCompletedPlatforms((prev) => new Set([...prev, p]))
                setGeneratedResults((prev) => ({ ...prev, [p]: event.content as string }))
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

  const saveToFirestore = async (results: Record<string, string> | { platform: string; content: string; error?: string }[]) => {
    if (!user) return
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      const db = await getDbInstance()
      const sourceData: Record<string, unknown> = {
        userId: user.uid,
        content: content.trim(),
        platforms: selectedPlatforms,
        sourceType: inputTab,
        createdAt: serverTimestamp(),
      }
      if (inputTab !== "text") {
        sourceData.sourceUrl = url.trim()
        if (extractedTitle) sourceData.sourceTitle = extractedTitle
      }

      const sourceRef = await addDoc(collection(db, "contentSources"), sourceData)

      const items = Array.isArray(results)
        ? results.filter((r) => r.content && !r.error)
        : Object.entries(results).map(([platform, content]) => ({ platform, content }))

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
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
            {inputTab === "text" ? "Content Source" : inputTab === "article" ? "Article URL" : "YouTube URL"}
          </CardTitle>
          <CardDescription>
            {inputTab === "text"
              ? "Paste your blog post, article, newsletter, or transcript."
              : inputTab === "article"
              ? "Enter a blog or article URL to extract its content."
              : "Paste any YouTube video link to extract its transcript."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(inputTab === "article" || inputTab === "youtube") && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    inputTab === "article"
                      ? "https://example.com/article"
                      : "https://www.youtube.com/watch?v=..."
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
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => !generating && togglePlatform(platform.id)}
                  disabled={generating}
                  className={`relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    checked
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                  } ${generating ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
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
                    <div className="flex items-center justify-center size-5 rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
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
          <span className="text-xs text-muted-foreground">
            {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
          </span>
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
            const result = generatedResults[platformId]
            const status = platformStatuses[platformId]
            if (status === "idle" || !status) return null

            return (
              <Card key={platformId} size="sm" className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-sm">{platform.label}</CardTitle>
                  <div className="flex items-center gap-1">
                    {status === "generating" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Generating...
                      </span>
                    )}
                    {status === "done" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleEditPrompt(platformId)}
                        >
                          <PenLine className="size-3" />
                          Edit prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          disabled
                        >
                          <Sparkles className="size-3" />
                          Publish
                        </Button>
                      </>
                    )}
                    {status === "error" && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                  </div>
                </CardHeader>
                {result && (
                  <CardContent className="pb-3">
                    <div className="relative">
                      <Textarea
                        readOnly
                        value={result}
                        className="min-h-[100px] resize-none text-sm pr-12"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-1.5 right-1.5 h-7 gap-1"
                        onClick={() => handleCopy(result, platform.label)}
                      >
                        <Copy className="size-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </Button>
                    </div>
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
