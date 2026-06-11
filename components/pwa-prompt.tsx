"use client"

import { useState, useEffect } from "react"

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (!deferredPrompt) return null

  return (
    <button
      onClick={async () => {
        ;(deferredPrompt as any).prompt()
        await (deferredPrompt as any).userChoice
        setDeferredPrompt(null)
      }}
      className="fixed bottom-20 right-4 z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-primary-dark"
    >
      Install App
    </button>
  )
}
