"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { FileText, Link, Play, File as FileIcon, Loader2 } from "lucide-react"

const inputTabs = [
  { id: "text", label: "Text", icon: FileText },
  { id: "article", label: "Article URL", icon: Link },
  { id: "youtube", label: "YouTube URL", icon: Play },
  { id: "pdf", label: "PDF URL", icon: FileIcon },
] as const

type InputTab = "text" | "article" | "youtube" | "pdf"

interface ContentInputProps {
  onContentReady: (content: string, title?: string, sourceType?: InputTab, sourceUrl?: string) => void
}

export function ContentInput({ onContentReady }: ContentInputProps) {
  const [inputTab, setInputTab] = useState<InputTab>("text")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracting, setExtracting] = useState(false)

  const handleTabChange = (tab: InputTab) => {
    setInputTab(tab)
    setUrl("")
    setExtractedTitle("")
    setContent("")
    onContentReady("", undefined, undefined, undefined)
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
      onContentReady(data.content || "", data.title, inputTab, url.trim())
      toast.success("Content extracted successfully!")
    } catch {
      toast.error("Failed to extract content. Check the URL and try again.")
    } finally {
      setExtracting(false)
    }
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    onContentReady(val, extractedTitle, inputTab, inputTab !== "text" ? url.trim() : undefined)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-1 rounded-xl bg-muted p-1 mb-3">
          {inputTabs.map((tab) => {
            const Icon = tab.icon
            const active = inputTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as InputTab)}
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
          onChange={(e) => handleContentChange(e.target.value)}
        />
      </CardContent>
    </Card>
  )
}
