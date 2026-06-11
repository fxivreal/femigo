"use client"

import { useRef, useState, useEffect } from "react"
import { Download, X } from "lucide-react"

export function InstallPrompt() {
  const deferredPrompt = useRef<Event | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      deferredPrompt.current = null
      setShow(false)
    }
    window.addEventListener("appinstalled", handler)
    return () => window.removeEventListener("appinstalled", handler)
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 border-b bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <Download className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Install Femigo</p>
          <p className="text-xs text-gray-500">Add to your home screen</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        >
          Not now
        </button>
        <button
          onClick={async () => {
            const ev = deferredPrompt.current as any
            if (!ev) return
            ev.prompt()
            await ev.userChoice
            deferredPrompt.current = null
            setShow(false)
          }}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Install
        </button>
      </div>
    </div>
  )
}
