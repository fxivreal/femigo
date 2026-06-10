"use client"

import { useState } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { platformPrompts } from "@/lib/prompts"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Sparkles, FileText, Loader2, Copy, PenLine, X, Link, Play } from "lucide-react"

const inputTabs = [
  { id: "text", label: "Text", icon: FileText },
  { id: "article", label: "Article URL", icon: Link },
  { id: "youtube", label: "YouTube URL", icon: Play },
]

const platforms = [
  "linkedin",
  "x",
  "facebook",
  "instagram",
  "tiktok",
]

type PlatformStatus = "idle" | "generating" | "done"

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

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [editPromptText, setEditPromptText] = useState("")
  const [regenerating, setRegenerating] = useState(false)

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
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
    if (tab === "text" && !content) {
      // keep content as-is when switching away and back
    }
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

    setGenerating(true)

    if (!promptOverrides) {
      setGeneratedResults({})
    }

    const statuses: Record<string, PlatformStatus> = {}
    const targets = promptOverrides ? Object.keys(promptOverrides) : selectedPlatforms
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

      const data = await res.json()

      const updatedStatuses = { ...statuses }
      const resultsMap: Record<string, string> = promptOverrides ? { ...generatedResults } : {}
      let hasContent = false

      for (const result of data.results as { platform: string; content: string; error?: string }[]) {
        if (result.error) {
          updatedStatuses[result.platform] = "idle"
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

      if (hasContent) {
        toast.success("Content generated successfully!")
      } else {
        toast.error("Generation failed. Check your OpenAI account billing or API key.")
      }

      if (!promptOverrides) {
        const saveToFirestore = async () => {
          try {
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

            await Promise.allSettled(
              data.results
                .filter((r: { platform: string; content: string; error?: string }) => r.content && !r.error)
                .map((r: { platform: string; content: string }) =>
                  addDoc(collection(db, "generatedContent"), {
                    userId: user.uid,
                    sourceId: sourceRef.id,
                    platform: r.platform,
                    content: r.content,
                    createdAt: serverTimestamp(),
                  })
                )
            )
          } catch {
            // Silent
          }
        }

        saveToFirestore()
      }
    } catch {
      toast.error("Failed to generate content. Please try again.")
      if (!promptOverrides) {
        setPlatformStatuses({})
      }
    } finally {
      setGenerating(false)
      setRegenerating(false)
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
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Create</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Paste content, a blog URL, or a YouTube URL to generate platform-specific posts.
      </p>

      {/* Input Type Tabs */}
      <div className="flex border-b mb-6">
        {inputTabs.map((tab) => {
          const Icon = tab.icon
          const active = inputTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as "text" | "article" | "youtube")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-[#1877F2] text-[#1877F2]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Text Input */}
      {inputTab === "text" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Content Source</CardTitle>
            <CardDescription>
              Paste your blog post, article, newsletter, or transcript.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your content here..."
              className="min-h-[300px] sm:min-h-[400px] resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Article / YouTube URL Input */}
      {(inputTab === "article" || inputTab === "youtube") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {inputTab === "article" ? "Article URL" : "YouTube URL"}
            </CardTitle>
            <CardDescription>
              {inputTab === "article"
                ? "Enter a blog or article URL to extract its content."
                : "Paste any YouTube video link to extract its transcript."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white shrink-0"
              >
                {extracting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : inputTab === "youtube" ? (
                  "Extract Transcript"
                ) : (
                  "Extract"
                )}
              </Button>
            </div>
            {inputTab === "youtube" && (
              <p className="text-xs text-muted-foreground">
                Works with <span className="font-medium">youtube.com/watch?v=...</span>,{" "}
                <span className="font-medium">youtu.be/...</span>, and other YouTube URL formats.
              </p>
            )}
            {extractedTitle && (
              <div className="bg-muted rounded-md px-3 py-2">
                <p className="text-xs text-muted-foreground">Title</p>
                <p className="text-sm font-medium">{extractedTitle}</p>
              </div>
            )}
            <Textarea
              placeholder={
                extracting
                  ? "Extracting content..."
                  : "Extracted content will appear here. You can edit it before generating."
              }
              className="min-h-[300px] sm:min-h-[400px] resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Target Platforms Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Target Platforms</CardTitle>
          <CardDescription>
            Select the platforms where you want to publish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            {platforms.map((platform) => {
              const checked = selectedPlatforms.includes(platform)
              const status = platformStatuses[platform]
              const result = generatedResults[platform]
              return (
                <div key={platform}>
                  <Label className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-muted has-data-checked:bg-primary/5">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePlatform(platform)}
                      disabled={generating}
                    />
                    <span className="text-sm font-medium capitalize flex-1">{platform}</span>
                    {status === "generating" && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    {status === "done" && (
                      <span className="text-xs text-emerald-600 font-medium">Done</span>
                    )}
                  </Label>
                  {checked && result !== undefined && result !== "" && (
                    <div className="ml-9 mt-2 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => handleEditPrompt(platform)}
                        >
                          <PenLine className="size-3.5" />
                          Edit Prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          disabled
                        >
                          <Sparkles className="size-3.5" />
                          Publish Prompt
                        </Button>
                      </div>
                      <div className="relative">
                        <Textarea
                          readOnly
                          value={result}
                          className="min-h-[100px] resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-1.5 right-1.5 h-7 gap-1"
                          onClick={() => handleCopy(result, platform)}
                        >
                          <Copy className="size-3" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={() => handleGenerate()}
        disabled={generating || !content.trim() || selectedPlatforms.length === 0}
        className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
      >
        {generating ? (
          <Loader2 className="size-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="size-4 mr-2" />
        )}
        {generating ? "Generating..." : "Generate"}
      </Button>

      {/* Edit Prompt Modal */}
      {editingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-base font-semibold capitalize">Edit Prompt — {editingPlatform}</h2>
              <button
                type="button"
                onClick={() => { setEditingPlatform(null); setEditPromptText("") }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 pb-1">
              <p className="text-xs text-muted-foreground">
                Edit the instruction for generating content on this platform. Your source content is included below.
              </p>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3">
              <Textarea
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                className="min-h-[200px] resize-none text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-2">
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
                className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
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
