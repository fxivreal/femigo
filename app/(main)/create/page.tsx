"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save, FileText, Newspaper, Mail, MessageSquare } from "lucide-react"

const supportedTypes = [
  { icon: FileText, label: "Blog" },
  { icon: Newspaper, label: "Article" },
  { icon: Mail, label: "Newsletter" },
  { icon: MessageSquare, label: "Transcript" },
]

export default function CreatePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content before saving.")
      return
    }

    if (!user) return

    setSaving(true)
    try {
      await addDoc(collection(db, "contentSources"), {
        userId: user.uid,
        content: content.trim(),
        createdAt: serverTimestamp(),
      })
      toast.success("Content saved successfully!")
      setContent("")
      router.refresh()
    } catch {
      toast.error("Failed to save content. Please try again.")
    } finally {
      setSaving(false)
    }
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

      <Button onClick={handleSave} disabled={saving || !content.trim()}>
        <Save className="size-4 mr-2" />
        {saving ? "Saving..." : "Save content"}
      </Button>
    </div>
  )
}
