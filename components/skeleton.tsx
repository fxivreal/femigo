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

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-3">
        <SkeletonLine width="60%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="45%" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonLine, PageSkeleton }
