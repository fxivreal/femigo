"use client"

import { useState } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { MessageSquareText, Loader2, X, Send } from "lucide-react"

export function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || !user) return
    setSending(true)
    try {
      const db = await getDbInstance()
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        email: user.email,
        message: message.trim(),
        createdAt: serverTimestamp(),
      })
      toast.success("Feedback sent — thank you!")
      setMessage("")
      setOpen(false)
    } catch {
      toast.error("Failed to send feedback.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 text-xs font-medium text-white bg-[#1877F2] hover:bg-[#1877F2]/80 px-4 py-2.5 rounded-full shadow-lg transition-all hover:shadow-xl active:scale-95"
      >
        <MessageSquareText className="size-3.5" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="text-base font-semibold">Send Feedback</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 pb-1">
              <p className="text-xs text-muted-foreground">
                Help us improve Femigo. Share your thoughts, suggestions, or report an issue.
              </p>
            </div>
            <div className="px-5 py-3">
              <Textarea
                placeholder="Type your feedback here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none text-sm focus-visible:ring-[#1877F2]/20"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
              >
                {sending ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <Send className="size-3 mr-1" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
