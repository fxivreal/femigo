"use client"

import { useState } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { platformPrompts } from "@/lib/prompts"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Sparkles, FileText, Newspaper, Mail, MessageSquare, Loader2, Copy, PenLine, X } from "lucide-react"

const supportedTypes = [
  { icon: FileText, label: "Blog" },
  { icon: Newspaper, label: "Article" },
  { icon: Mail, label: "Newsletter" },
  { icon: MessageSquare, label: "Transcript" },
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
  const [content, setContent] = useState("")
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

  const handleGenerate = async (promptOverrides?: Record<string, string>) => {
    if (!content.trim()) {
      toast.error("Please enter some content before saving.")
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
            const sourceRef = await addDoc(collection(db, "contentSources"), {
              userId: user.uid,
              content: content.trim(),
              platforms: selectedPlatforms,
              createdAt: serverTimestamp(),
            })

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
        Paste your content below and generate posts across platforms.
      </p>

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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {supportedTypes.map((type) => {
          const Icon = type.icon
          return (
            <span
              key={type.label}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full"
            >
              <Icon className="size-3" />
              {type.label}
            </span>
          )
        })}
      </div>

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
