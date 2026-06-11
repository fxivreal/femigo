"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl font-bold text-heading/20">500</span>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white">
          Try again
        </Button>
      </div>
    </div>
  )
}
