"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@eshanika/ui/components/input-group";
import { Skeleton } from "@eshanika/ui/components/skeleton";
import { cn } from "@eshanika/ui/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, Loader2, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { EmptyState, ErrorState } from "@/components/patterns/page-state";
import { orpc } from "@/orpc/query";
import type { MediaAsset } from "../hooks/use-image-upload";

type MediaLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeIds: string[];
  onSelect: (assets: MediaAsset[]) => void;
};

export function MediaLibraryDialog({
  open,
  onOpenChange,
  excludeIds,
  onSelect,
}: MediaLibraryDialogProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selected, setSelected] = useState<MediaAsset[]>([]);
  const media = useInfiniteQuery({
    ...orpc.catalog.media.list.infiniteOptions({
      input: (cursor: string | undefined) => ({
        search: deferredSearch || undefined,
        cursor,
        limit: 24,
      }),
      initialPageParam: undefined,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
    enabled: open,
  });
  const items = (media.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((item) => item.status === "active");

  function toggle(asset: MediaAsset) {
    setSelected((current) =>
      current.some((item) => item.id === asset.id)
        ? current.filter((item) => item.id !== asset.id)
        : [...current, asset],
    );
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) setSelected([]);
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose from library</DialogTitle>
          <DialogDescription>
            Pick images you've already uploaded.
          </DialogDescription>
        </DialogHeader>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search images by file name"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by file name"
            type="search"
            value={search}
          />
        </InputGroup>
        <div className="-mx-1 min-h-48 flex-1 overflow-y-auto px-1 py-1">
          {media.isPending ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton
                  className="aspect-square rounded-lg"
                  // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                  key={index}
                />
              ))}
            </div>
          ) : media.isError ? (
            <ErrorState error={media.error} onRetry={() => media.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              description={
                deferredSearch
                  ? "No image matches that name."
                  : "Upload images to build your library."
              }
              title="No images"
            />
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((asset) => {
                const added = excludeIds.includes(asset.id);
                const isSelected = selected.some(
                  (item) => item.id === asset.id,
                );
                return (
                  <li key={asset.id}>
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        "group relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                        isSelected &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        added && "cursor-not-allowed opacity-50",
                      )}
                      disabled={added}
                      onClick={() => toggle(asset)}
                      type="button"
                    >
                      {/* biome-ignore lint/performance/noImgElement: signed storage URLs expire, so Next image caching doesn't fit */}
                      <img
                        alt={asset.altText ?? ""}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        src={asset.readUrl}
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-left text-xs text-white">
                        {added ? "Already added" : asset.originalFileName}
                      </span>
                      {isSelected ? (
                        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check aria-hidden className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {media.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                disabled={media.isFetchingNextPage}
                onClick={() => media.fetchNextPage()}
                size="sm"
                variant="outline"
              >
                {media.isFetchingNextPage ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onSelect(selected);
              setSelected([]);
              onOpenChange(false);
            }}
          >
            Add {selected.length > 0 ? selected.length : ""} image
            {selected.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
