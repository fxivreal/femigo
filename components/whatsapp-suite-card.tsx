"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, Download, Loader2, MessageCircle, Check } from "lucide-react"

interface WhatsAppSuiteCardProps {
  typeId: string
  label: string
  icon: string
  content: string
  status: "idle" | "generating" | "done" | "error"
  extra?: React.ReactNode
}

const typeColors: Record<string, string> = {
  status: "border-green-200 bg-green-50/30",
  promotional: "border-emerald-200 bg-emerald-50/30",
  "quick-reply": "border-teal-200 bg-teal-50/30",
  broadcast: "border-green-200 bg-green-50/30",
  "follow-up": "border-emerald-200 bg-emerald-50/30",
}

export function WhatsAppSuiteCard({ typeId, label, icon, content, status, extra }: WhatsAppSuiteCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(`${label} copied!`)
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `whatsapp-${typeId}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${label} exported!`)
  }

  const handleSendWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(content)
      const encoded = encodeURIComponent(content.slice(0, 1500))
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
      toast.success("Copied & WhatsApp opened!")
    } catch {
      toast.error("Failed to copy.")
    }
  }

  const borderColor = typeColors[typeId] || "border-green-200 bg-green-50/30"

  return (
    <Card className={`overflow-hidden ${borderColor}`}>
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-green-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <CardTitle className="text-sm text-green-700">{label}</CardTitle>
        </div>
        {status === "generating" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Generating...
          </span>
        )}
        {status === "done" && content && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSendWhatsApp}>
              <MessageCircle className="size-3" />
              <span className="hidden sm:inline">Send to WhatsApp</span>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleExport}>
              <Download className="size-3" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        )}
        {status === "error" && (
          <span className="text-xs text-destructive">Failed</span>
        )}
      </CardHeader>
      <CardContent className="pb-3 pt-3">
        {status === "generating" && !content && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="space-y-2">
              <div className="h-3 w-full animate-skeleton rounded bg-foreground/5" />
              <div className="h-3 w-4/5 animate-skeleton rounded bg-foreground/5" />
              <div className="h-3 w-3/5 animate-skeleton rounded bg-foreground/5" />
            </div>
          </div>
        )}
        {(status === "done" || (status === "generating" && content)) && content && (
          <Textarea
            readOnly
            value={content}
            className="min-h-[100px] resize-none text-sm"
          />
        )}
        {extra}
      </CardContent>
    </Card>
  )
}
