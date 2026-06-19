export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[6px] bg-[#EAEAEA] ${className ?? ""}`}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-5 space-y-3">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}
