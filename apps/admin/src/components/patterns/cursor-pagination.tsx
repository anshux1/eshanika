"use client";

import { Button } from "@eshanika/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Keeps the cursor trail in the URL (`cursor` plus `prev`) so Back, refresh, and shared links all work.
export function CursorPagination({
  nextCursor,
}: {
  nextCursor: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trail = searchParams.getAll("prev");
  const cursor = searchParams.get("cursor");

  function go(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function next() {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.append("prev", cursor ?? "");
    params.set("cursor", nextCursor);
    go(params);
  }

  function previous() {
    const params = new URLSearchParams(searchParams);
    const previousTrail = trail.slice(0, -1);
    const previousCursor = trail.at(-1);
    params.delete("prev");
    for (const value of previousTrail) params.append("prev", value);
    if (previousCursor) params.set("cursor", previousCursor);
    else params.delete("cursor");
    go(params);
  }

  if (!cursor && !nextCursor) return null;

  return (
    <nav aria-label="Pagination" className="flex justify-end gap-2">
      <Button disabled={!cursor} onClick={previous} size="sm" variant="outline">
        <ChevronLeft aria-hidden />
        Previous
      </Button>
      <Button disabled={!nextCursor} onClick={next} size="sm" variant="outline">
        Next
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
