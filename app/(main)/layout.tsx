"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardNav } from "@/components/dashboard-nav"
import { FeedbackButton } from "@/components/feedback-button"
import { Skeleton } from "@/components/skeleton"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-[#6366F1]/10">
            <div className="size-5 rounded-sm bg-[#6366F1] animate-pulse" />
          </div>
          <div className="space-y-2 w-40">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <DashboardNav />
      <main className="flex-1 md:ml-60 pb-16 md:pb-0">
        {children}
      </main>
      <FeedbackButton />
    </div>
  )
}
