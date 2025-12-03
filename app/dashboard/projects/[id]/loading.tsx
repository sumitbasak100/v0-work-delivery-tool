import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-48" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </header>

      {/* Progress bar skeleton */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 flex-1 max-w-md rounded-full" />
        </div>
      </div>

      {/* Filter tabs skeleton */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-2 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* File grid skeleton */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
