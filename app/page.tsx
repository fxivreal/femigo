import Link from "next/link"
import { Sparkles, Repeat2, FileCheck, Globe, ChevronRight } from "lucide-react"

const features = [
  {
    icon: FileCheck,
    title: "Paste your source",
    description: "Drop in a blog post, article URL, or YouTube link as your source material.",
  },
  {
    icon: Repeat2,
    title: "Repurpose instantly",
    description: "AI rewrites your content for each platform — tone, length, and format optimized.",
  },
  {
    icon: Globe,
    title: "Publish everywhere",
    description: "LinkedIn, X, Facebook, Instagram, TikTok — one source, many formats.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 h-14 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#6366F1]" />
          <span className="font-semibold text-base text-heading">Femigo</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#6366F1] px-4 text-sm font-medium text-white hover:bg-[#6366F1]/80 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="absolute inset-0 bg-gradient-to-b from-[#6366F1]/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="size-3 text-[#6366F1]" />
              AI-powered content repurposing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-heading leading-[1.1]">
              Create once.
              <br />
              Publish everywhere.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Paste your content once and let AI reshape it for every platform — LinkedIn articles,
              X threads, Facebook posts, Instagram captions, and TikTok scripts.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#6366F1] px-6 text-sm font-medium text-white hover:bg-[#6366F1]/80 transition-colors gap-1.5 w-full sm:w-auto"
              >
                Get started free
                <ChevronRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors w-full sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-heading">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three simple steps to repurpose your content.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border bg-card p-6 hover:shadow-md hover:border-foreground/20 transition-all"
                  >
                    <div className="flex items-center justify-center size-10 rounded-lg bg-[#6366F1]/10 text-[#6366F1] mb-4">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        0{i + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#6366F1]" />
            <span className="text-sm font-medium text-heading">Femigo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Femigo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
