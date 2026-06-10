import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Femigo
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Create once, publish everywhere.
        </p>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
