"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import { Skeleton } from "@eshanika/ui/components/skeleton";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Images,
  Loader2,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ErrorState,
  errorCode,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { orpc } from "@/orpc/query";
import { useImageUpload } from "../hooks/use-image-upload";
import { AltTextForm } from "./alt-text-form";
import { ImageDropzone } from "./image-dropzone";
import { MediaLibraryDialog } from "./media-library-dialog";

type DraftImage = {
  id: string;
  readUrl: string;
  altText: string | null;
  originalFileName: string;
};

type Draft = { images: DraftImage[]; primaryId: string | null };

function sameDraft(a: Draft, b: Draft) {
  return (
    a.primaryId === b.primaryId &&
    a.images.length === b.images.length &&
    a.images.every((image, index) => image.id === b.images[index]?.id)
  );
}

function AltTextDialog({
  imageId,
  onClose,
}: {
  imageId: string | null;
  onClose: () => void;
}) {
  const asset = useQuery({
    ...orpc.catalog.media.get.queryOptions({ input: { id: imageId ?? "" } }),
    enabled: imageId !== null,
  });
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={imageId !== null}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Image alt text</DialogTitle>
          <DialogDescription>
            Saved to the image right away. Every product using it sees the
            change.
          </DialogDescription>
        </DialogHeader>
        {asset.isPending ? (
          <LoadingState rows={2} />
        ) : asset.isError ? (
          <ErrorState error={asset.error} onRetry={() => asset.refetch()} />
        ) : (
          <div className="space-y-4">
            {/* biome-ignore lint/performance/noImgElement: signed storage URLs expire, so Next image caching doesn't fit */}
            <img
              alt=""
              className="mx-auto max-h-48 rounded-lg border object-contain"
              src={asset.data.readUrl}
            />
            <AltTextForm
              asset={asset.data}
              key={asset.data.updatedAt.toString()}
              onSaved={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ProductMediaCardProps = {
  productId: string;
  revision: string;
  onSaved: (revision: string) => void;
  onConflict: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

// Images save separately from the product form. Each save bumps the product
// revision, which the editor then uses for its next save.
export function ProductMediaCard({
  productId,
  revision,
  onSaved,
  onConflict,
  onDirtyChange,
}: ProductMediaCardProps) {
  const queryClient = useQueryClient();
  const saved = useQuery({
    ...orpc.catalog.media.getProductMedia.queryOptions({
      input: { productId },
    }),
    // Signed image links expire after 15 minutes.
    refetchInterval: 10 * 60_000,
  });
  const savedDraft: Draft | null = saved.data
    ? {
        images: saved.data.items.map((item) => ({
          id: item.id,
          readUrl: item.readUrl,
          altText: item.altText,
          originalFileName: item.originalFileName,
        })),
        primaryId:
          saved.data.items.find((item) => item.role === "primary")?.id ?? null,
      }
    : null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [altImageId, setAltImageId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const uploader = useImageUpload();

  const current = draft ?? savedDraft;
  const dirty =
    draft !== null && savedDraft !== null && !sameDraft(draft, savedDraft);

  // Fresh read URLs and alt text come from the latest fetch.
  const latest = new Map(
    saved.data?.items.map((item) => [item.id, item]) ?? [],
  );

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (draft && savedDraft && sameDraft(draft, savedDraft)) setDraft(null);
  }, [draft, savedDraft]);

  const save = useMutation(
    orpc.catalog.media.setProductMedia.mutationOptions({
      onSuccess: (result) => {
        toast.success("Images saved");
        onSaved(new Date(result.updatedAt).toISOString());
        setDraft(null);
        void queryClient.invalidateQueries({
          queryKey: orpc.catalog.media.key(),
        });
        void queryClient.invalidateQueries({
          queryKey: orpc.catalog.products.key(),
        });
      },
      onError: (error) => {
        if (errorCode(error) === "CONFLICT") {
          toast.error(errorMessage(error), {
            action: { label: "Reload", onClick: onConflict },
          });
          return;
        }
        toast.error(errorMessage(error));
      },
    }),
  );

  function update(next: Draft) {
    setDraft(next);
  }

  function addImages(images: DraftImage[]) {
    if (!current) return;
    const existing = new Set(current.images.map((image) => image.id));
    const added = images.filter((image) => !existing.has(image.id));
    const all = [...current.images, ...added];
    update({ images: all, primaryId: current.primaryId ?? all[0]?.id ?? null });
  }

  function remove(id: string) {
    if (!current) return;
    const images = current.images.filter((image) => image.id !== id);
    update({
      images,
      primaryId:
        current.primaryId === id ? (images[0]?.id ?? null) : current.primaryId,
    });
  }

  function move(from: number, to: number) {
    if (!current || to < 0 || to >= current.images.length || from === to) {
      return;
    }
    const images = [...current.images];
    const [image] = images.splice(from, 1);
    if (!image) return;
    images.splice(to, 0, image);
    update({ ...current, images });
  }

  const primary = current?.images.find(
    (image) => image.id === current.primaryId,
  );
  const primaryAlt = primary
    ? (latest.get(primary.id)?.altText ?? primary.altText)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
        <CardDescription>
          Drag to reorder. The starred image is the main product photo.
        </CardDescription>
        <CardAction>
          <Button
            onClick={() => setLibraryOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Images aria-hidden />
            Library
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        ) : saved.isError ? (
          <ErrorState error={saved.error} onRetry={() => saved.refetch()} />
        ) : current ? (
          <>
            {current.images.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {current.images.map((image, index) => {
                  const isPrimary = image.id === current.primaryId;
                  const altText =
                    latest.get(image.id)?.altText ?? image.altText;
                  return (
                    <li
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-xl border bg-muted transition",
                        isPrimary &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        dragIndex === index && "opacity-40",
                      )}
                      draggable
                      key={image.id}
                      onDragEnd={() => setDragIndex(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragIndex !== null && dragIndex !== index) {
                          move(dragIndex, index);
                          setDragIndex(index);
                        }
                      }}
                      onDragStart={() => setDragIndex(index)}
                    >
                      {/* biome-ignore lint/performance/noImgElement: signed storage URLs expire, so Next image caching doesn't fit */}
                      <img
                        alt={altText ?? ""}
                        className="size-full cursor-grab object-cover active:cursor-grabbing"
                        draggable={false}
                        src={latest.get(image.id)?.readUrl ?? image.readUrl}
                      />
                      <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                        {isPrimary ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[0.7rem] font-medium text-primary-foreground shadow">
                            Primary
                          </span>
                        ) : null}
                        {!altText ? (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[0.7rem] font-medium text-white shadow">
                            No alt text
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-2 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        {(
                          [
                            {
                              label: "Move earlier",
                              icon: ArrowLeft,
                              onClick: () => move(index, index - 1),
                              disabled: index === 0,
                            },
                            {
                              label: isPrimary
                                ? "Primary image"
                                : "Make primary",
                              icon: Star,
                              onClick: () =>
                                update({ ...current, primaryId: image.id }),
                              disabled: isPrimary,
                            },
                            {
                              label: "Edit alt text",
                              icon: FileText,
                              onClick: () => setAltImageId(image.id),
                              disabled: false,
                            },
                            {
                              label: "Remove from product",
                              icon: X,
                              onClick: () => remove(image.id),
                              disabled: false,
                            },
                            {
                              label: "Move later",
                              icon: ArrowRight,
                              onClick: () => move(index, index + 1),
                              disabled: index === current.images.length - 1,
                            },
                          ] as const
                        ).map((action) => (
                          <Button
                            aria-label={`${action.label}: ${image.originalFileName}`}
                            className="size-7 bg-white/90 text-neutral-900 hover:bg-white disabled:opacity-40"
                            disabled={action.disabled}
                            key={action.label}
                            onClick={action.onClick}
                            size="icon-sm"
                            title={action.label}
                            type="button"
                            variant="ghost"
                          >
                            <action.icon aria-hidden />
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <ImageDropzone
              compact={current.images.length > 0}
              onFiles={async (files) => {
                const created = await uploader.upload(files);
                addImages(created);
              }}
              pending={uploader.isPending}
              progress={uploader.progress}
            />
            {primary && !primaryAlt ? (
              <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                <TriangleAlert aria-hidden className="size-4 shrink-0" />
                Add alt text to the primary image before publishing.
              </p>
            ) : null}
            {dirty ? (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">Image changes aren't saved yet.</p>
                <div className="flex gap-2">
                  <Button
                    disabled={save.isPending}
                    onClick={() => setDraft(null)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Discard
                  </Button>
                  <Button
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate({
                        productId,
                        updatedAt: revision,
                        mediaIds: current.images.map((image) => image.id),
                        primaryId: current.primaryId,
                      })
                    }
                    size="sm"
                    type="button"
                  >
                    {save.isPending ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : null}
                    Save images
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
      <MediaLibraryDialog
        excludeIds={current?.images.map((image) => image.id) ?? []}
        onOpenChange={setLibraryOpen}
        onSelect={(assets) =>
          addImages(
            assets.map((asset) => ({
              id: asset.id,
              readUrl: asset.readUrl,
              altText: asset.altText,
              originalFileName: asset.originalFileName,
            })),
          )
        }
        open={libraryOpen}
      />
      <AltTextDialog imageId={altImageId} onClose={() => setAltImageId(null)} />
    </Card>
  );
}
