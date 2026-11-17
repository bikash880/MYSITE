import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page pt-16 sm:pt-24" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-32 rounded-full" />
      <Skeleton className="mt-6 h-14 w-3/4 max-w-2xl sm:h-20" />
      <Skeleton className="mt-6 h-5 w-full max-w-xl" />
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
            <Skeleton className="aspect-[16/11] rounded-none" />
            <div className="space-y-3 p-6">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
