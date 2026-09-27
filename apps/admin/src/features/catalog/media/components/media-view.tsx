"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@eshanika/ui/components/sheet";
import { Skeleton } from "@eshanika/ui/components/skeleton";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { StatusBadge } from "@/components/patterns/status-badge";
import { ProductStatusBadge } from "@/features/catalog/products/components/product-status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatBytes, formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { useImageUpload } from "../hooks/use-image-upload";
import { AltTextForm } from "./alt-text-form";
import { ImageDropzone } from "./image-dropzone";

function MediaDetails({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [archiving, setArchiving] = useState(false);
  const asset = useQuery({
    ...orpc.catalog.media.get.queryOptions({ input: { id: id ?? "" } }),
    enabled: id !== null,
  });
  const archive = useMutation(
    orpc.catalog.media.archive.mutationOptions({
      onSuccess: () => {
        toast.success("Image archived");
        setArchiving(false);
        onClose();
      },
      onError: (error) => {
        setArchiving(false);
        toast.error(errorMessage(error));
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: orpc.catalog.media.key() }),
    }),
  );
  const data = asset.data;
  const liveProducts =
    data?.productMedia.filter((link) => link.product.status === "active") ?? [];

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={id !== null}
    >
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="truncate pr-8">
            {data?.originalFileName ?? "Image"}
          </SheetTitle>
          <SheetDescription>
            {data
              ? `${data.width} × ${data.height} · ${formatBytes(data.fileSizeBytes)} · ${data.mimeType.replace("image/", "").toUpperCase()}`
              : "Loading details"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {asset.isPending ? (
            <LoadingState rows={4} />
          ) : asset.isError ? (
            <ErrorState error={asset.error} onRetry={() => asset.refetch()} />
          ) : data ? (
            <>
              <div className="overflow-hidden rounded-xl border bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                {/* biome-ignore lint/performance/noImgElement: signed storage URLs expire, so Next image caching doesn't fit */}
                <img
                  alt={data.altText ?? ""}
                  className="mx-auto max-h-72 object-contain"
                  src={data.readUrl}
                />
              </div>
              {data.status === "archived" ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                  This image is archived and can't be changed.
                </p>
              ) : (
                <AltTextForm asset={data} key={data.updatedAt.toString()} />
              )}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Used by</h3>
                {data.productMedia.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not on any product yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {data.productMedia.map((link) => (
                      <li key={link.product.id}>
                        <Link
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                          href={`/products/${link.product.id}`}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {link.product.name}
                          </span>
                          {link.role === "primary" ? (
                            <StatusBadge tone="info">Primary</StatusBadge>
                          ) : null}
                          <ProductStatusBadge status={link.product.status} />
                          <ExternalLink
                            aria-hidden
                            className="size-3.5 text-muted-foreground"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDateTime(data.createdAt)}
              </p>
            </>
          ) : null}
        </div>
        {data && data.status === "active" ? (
          <SheetFooter className="border-t">
            <Button onClick={() => setArchiving(true)} variant="destructive">
              <Archive aria-hidden />
              Archive image
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
      <ConfirmDialog
        confirmLabel="Archive"
        description={
          liveProducts.length > 0
            ? `It's on ${liveProducts.length} active product${liveProducts.length === 1 ? "" : "s"}. Remove it from them or archive those products first.`
            : "It's hidden from the image picker. Products that already use it keep it until you remove it."
        }
        destructive
        onConfirm={() => {
          if (data) archive.mutate({ id: data.id, updatedAt: data.updatedAt });
        }}
        onOpenChange={setArchiving}
        open={archiving}
        pending={archive.isPending}
        title="Archive this image?"
      />
    </Sheet>
  );
}

export function MediaView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const search = url.get("q");
  const [openId, setOpenId] = useState<string | null>(null);
  const uploader = useImageUpload();
  const media = useQuery({
    ...orpc.catalog.media.list.queryOptions({
      input: { cursor: url.get("cursor"), search, limit: 24 },
    }),
    // Signed image links expire after 15 minutes.
    refetchInterval: 10 * 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Every product image, with alt text and where it's used."
        title="Media"
      />
      <ImageDropzone
        compact
        onFiles={async (files) => {
          const created = await uploader.upload(files);
          if (created.length > 0) {
            void queryClient.invalidateQueries({
              queryKey: orpc.catalog.media.key(),
            });
          }
        }}
        pending={uploader.isPending}
        progress={uploader.progress}
      />
      <SearchInput placeholder="Search by file name" />
      {media.isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton className="aspect-square rounded-xl" key={index} />
          ))}
        </div>
      ) : media.isError ? (
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      ) : media.data.items.length === 0 ? (
        <EmptyState
          description={
            search
              ? "No image matches that file name."
              : "Upload images above, or add them from a product."
          }
          title={search ? "No matches" : "No images yet"}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.data.items.map((asset) => (
            <li key={asset.id}>
              <button
                className={cn(
                  "group block w-full overflow-hidden rounded-xl border bg-card text-left outline-none transition hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50",
                  asset.status === "archived" && "opacity-60",
                )}
                onClick={() => setOpenId(asset.id)}
                type="button"
              >
                <span className="relative block aspect-square overflow-hidden bg-muted">
                  {/* biome-ignore lint/performance/noImgElement: signed storage URLs expire, so Next image caching doesn't fit */}
                  <img
                    alt={asset.altText ?? ""}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    src={asset.readUrl}
                  />
                  <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
                    {asset.status === "archived" ? (
                      <StatusBadge tone="neutral">Archived</StatusBadge>
                    ) : !asset.altText ? (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[0.7rem] font-medium text-white shadow">
                        No alt text
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="block space-y-0.5 px-3 py-2">
                  <span className="block truncate text-sm font-medium">
                    {asset.originalFileName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {asset.productMedia.length === 0
                      ? "Unused"
                      : `On ${asset.productMedia.length} product${asset.productMedia.length === 1 ? "" : "s"}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {media.data ? (
        <CursorPagination nextCursor={media.data.nextCursor} />
      ) : null}
      <MediaDetails id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
