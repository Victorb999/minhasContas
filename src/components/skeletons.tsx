import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="mx-auto h-10 w-48 rounded-full" />
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 rounded-2xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-2xl" />
      ))}
    </div>
  );
}
