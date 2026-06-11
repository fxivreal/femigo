import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-skeleton rounded-lg bg-foreground/5", className)}
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <Skeleton className="h-3 w-full" style={{ width }} />
}

export { Skeleton, SkeletonCard, SkeletonLine }
