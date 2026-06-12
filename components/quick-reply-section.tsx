"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Send, Copy, Check, MessageCircle } from "lucide-react"

interface QuickReplySectionProps {
  sourceContent: string
  analysisJson: string | null
}

export function QuickReplySection({ sourceContent, analysisJson }: QuickReplySectionProps) {
  const [question, setQuestion] = useState("")
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerateReply = async () => {
    if (!question.trim()) {
      toast.error("Please enter a customer question.")
      return
    }

    setLoading(true)
    setReply("")

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: sourceContent,
          analysis: analysisJson ? JSON.parse(analysisJson) : undefined,
          whatsappSuite: true,
          types: ["quick-reply"],
          quickReplyQuestion: question.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate reply")
      }

      const contentType = res.headers.get("Content-Type") || ""

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
                setReply(event.content as string)
              } else if (event.type === "error") {
                toast.error(event.message as string || "Failed to generate reply")
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } else {
        const data = await res.json()
        if (data.reply) {
          setReply(data.reply)
        } else if (data.error) {
          toast.error(data.error)
        }
      }
    } catch {
      toast.error("Failed to generate reply. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reply)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Reply copied!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleSendWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(reply)
      const encoded = encodeURIComponent(reply.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="border-t border-teal-100 pt-3">
        <p className="text-xs font-medium text-teal-700 mb-2">Customer asked a different question?</p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Do you deliver to Port Harcourt?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleGenerateReply() }}
            className="text-sm"
            disabled={loading}
          />
          <Button
            onClick={handleGenerateReply}
            disabled={loading || !question.trim()}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="hidden sm:inline ml-1">Reply</span>
          </Button>
        </div>
      </div>

      {loading && !reply && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="space-y-2">
            <div className="h-3 w-full animate-skeleton rounded bg-foreground/5" />
            <div className="h-3 w-3/4 animate-skeleton rounded bg-foreground/5" />
          </div>
        </div>
      )}

      {reply && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-teal-700">Reply</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSendWhatsApp}>
                <MessageCircle className="size-3" />
                Send
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={handleCopy}>
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap">{reply}</p>
        </div>
      )}
    </div>
  )
}
