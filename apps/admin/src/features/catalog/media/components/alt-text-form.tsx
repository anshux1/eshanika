"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Textarea } from "@eshanika/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/components/patterns/page-state";
import { orpc } from "@/orpc/query";

type AltTextFormProps = {
  asset: { id: string; altText: string | null; updatedAt: Date };
  onSaved?: () => void;
};

export function AltTextForm({ asset, onSaved }: AltTextFormProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(asset.altText ?? "");
  const save = useMutation(
    orpc.catalog.media.updateAlt.mutationOptions({
      onSuccess: () => {
        toast.success("Alt text saved");
        void queryClient.invalidateQueries({
          queryKey: orpc.catalog.media.key(),
        });
        void queryClient.invalidateQueries({
          queryKey: orpc.catalog.products.key(),
        });
        onSaved?.();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );
  const unchanged = value.trim() === (asset.altText ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        // React bubbles portal events, so this would also submit a product form around the dialog.
        event.stopPropagation();
        save.mutate({
          id: asset.id,
          altText: value.trim(),
          updatedAt: asset.updatedAt,
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor={`alt-${asset.id}`}>Alt text</FieldLabel>
        <Textarea
          id={`alt-${asset.id}`}
          maxLength={500}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Gold kundan choker with green stones, front view"
          rows={3}
          value={value}
        />
        <FieldDescription>
          Describe what the image shows for screen readers and search. Primary
          images on live products need it.
        </FieldDescription>
      </Field>
      <div className="flex justify-end">
        <Button disabled={unchanged || save.isPending} size="sm" type="submit">
          {save.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Save alt text
        </Button>
      </div>
    </form>
  );
}
