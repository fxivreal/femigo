import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl font-bold text-heading/20">404</span>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="max-w-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary/80 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
