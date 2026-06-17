"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Link2, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"

interface LinkedInStatus {
  connected: boolean
  name?: string
  email?: string
  expired?: boolean
}

export function ConnectLinkedIn() {
  const { user } = useAuth()
  const [status, setStatus] = useState<LinkedInStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    checkStatus()

    const params = new URLSearchParams(window.location.search)
    const linkedinParam = params.get("linkedin")
    if (linkedinParam === "connected") {
      toast.success("LinkedIn connected!")
      checkStatus()
      window.history.replaceState({}, "", "/connections")
    } else if (linkedinParam === "error" || linkedinParam === "token_error" || linkedinParam === "profile_error") {
      toast.error("Failed to connect LinkedIn.")
      window.history.replaceState({}, "", "/connections")
    }
  }, [user])

  const checkStatus = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/linkedin/status?userId=${user.uid}`)
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    if (!user) return
    window.location.href = `/api/linkedin/auth?userId=${user.uid}`
  }

  if (!user) return null

  const isConnected = status?.connected && !status?.expired

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
          <Link2 className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">LinkedIn</p>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Checking..."
              : isConnected
                ? `Connected as ${status.name || status.email || "LinkedIn user"}`
                : status?.expired
                  ? "Token expired — reconnect"
                  : "Not connected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : isConnected ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <Check className="size-3" />
            Active
          </span>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleConnect}>
            <Link2 className="size-3 mr-1" />
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}
