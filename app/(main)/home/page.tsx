"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { user } = useAuth()
  const name = user?.displayName || "User"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome, {name}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Create once, publish everywhere.
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Generations</h2>
        <Card>
          <CardHeader>
            <CardTitle>No generations yet</CardTitle>
            <CardDescription>
              Create your first piece of content and repurpose it across all your platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create">
              <Button>
                <Sparkles className="size-4 mr-2" />
                Create content
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}