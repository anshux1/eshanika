"use client";

import { cn } from "@eshanika/ui/lib/utils";
import { ImageUp, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { ACCEPTED_IMAGE_TYPES } from "../hooks/use-image-upload";

type ImageDropzoneProps = {
  onFiles: (files: File[]) => void;
  pending: boolean;
  progress: number;
  className?: string;
  compact?: boolean;
};

export function ImageDropzone({
  onFiles,
  pending,
  progress,
  className,
  compact = false,
}: ImageDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        compact ? "py-6" : "py-10",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-ring/50 hover:bg-muted/40",
        pending && "pointer-events-none opacity-80",
        className,
      )}
      htmlFor={inputId}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-6 animate-spin text-primary" />
          <span className="font-medium">
            Uploading {Math.round(progress * 100)}%
          </span>
          <span
            aria-hidden
            className="h-1 w-40 overflow-hidden rounded-full bg-muted"
          >
            <span
              className="block h-full bg-primary transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        </>
      ) : (
        <>
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImageUp aria-hidden className="size-5" />
          </span>
          <span>
            <span className="font-medium">Drop images here</span> or click to
            browse
          </span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or AVIF up to 10 MB
          </span>
        </>
      )}
      <input
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={pending}
        id={inputId}
        multiple
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
}
