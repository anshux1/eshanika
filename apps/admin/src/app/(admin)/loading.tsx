import { Skeleton } from "@eshanika/ui/components/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-6xl space-y-6">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
          <Skeleton className="h-12 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
