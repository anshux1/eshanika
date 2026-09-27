"use client";

import { useUploadFiles } from "@better-upload/client";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/components/patterns/page-state";
import { client } from "@/orpc/client";
import type { RouterOutputs } from "@/orpc/types";

export type MediaAsset = RouterOutputs["catalog"]["media"]["create"];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Files go straight from the browser to storage, then the server checks each
// one before it becomes a library image.
export function useImageUpload() {
  const uploader = useUploadFiles({ route: "images", api: "/api/upload" });
  const [registering, setRegistering] = useState(false);

  async function upload(files: File[]): Promise<MediaAsset[]> {
    const valid = files.filter((file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: use JPEG, PNG, WebP, or AVIF.`);
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: images must be 10 MB or smaller.`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return [];

    let uploaded: Awaited<ReturnType<typeof uploader.uploadAsync>>;
    try {
      uploaded = await uploader.uploadAsync(valid);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Upload failed. Try again.";
      toast.error(message);
      return [];
    }
    for (const failed of uploaded.failedFiles) {
      toast.error(`${failed.name}: ${failed.error.message}`);
    }

    setRegistering(true);
    const created: MediaAsset[] = [];
    try {
      for (const file of uploaded.files) {
        try {
          created.push(
            await client.catalog.media.create({
              storageKey: file.objectInfo.key,
              originalFileName: file.name,
            }),
          );
        } catch (error) {
          toast.error(`${file.name}: ${errorMessage(error)}`);
        }
      }
    } finally {
      setRegistering(false);
    }
    if (created.length > 0) {
      toast.success(
        `${created.length} image${created.length === 1 ? "" : "s"} uploaded`,
      );
    }
    uploader.reset();
    return created;
  }

  return {
    upload,
    isPending: uploader.isPending || registering,
    progress: uploader.averageProgress,
  };
}
