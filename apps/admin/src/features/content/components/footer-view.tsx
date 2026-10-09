"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/patterns/page-header";
import {
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { RichTextEditor } from "./rich-text-editor";

type Footer = RouterOutputs["content"]["footer"]["get"];

export function FooterView() {
  const footer = useQuery(orpc.content.footer.get.queryOptions());

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        description="The text at the bottom of every store page. Footer links are managed in Menus."
        title="Footer"
      />
      {footer.isPending ? (
        <LoadingState rows={4} />
      ) : footer.isError ? (
        <ErrorState error={footer.error} onRetry={() => footer.refetch()} />
      ) : (
        <FooterForm footer={footer.data} key={String(footer.data?.updatedAt)} />
      )}
    </div>
  );
}

function FooterForm({ footer }: { footer: Footer }) {
  const queryClient = useQueryClient();
  const saved = footer?.bodyHtml ?? "";
  const [html, setHtml] = useState(saved);
  const dirty = html !== saved;
  useUnsavedChanges(dirty);
  const save = useMutation(
    orpc.content.footer.save.mutationOptions({
      onSuccess: () => toast.success("Footer saved"),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: orpc.content.footer.key() }),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer text</CardTitle>
        <CardDescription>
          For example your address, GST number, and a short note.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RichTextEditor onChange={setHtml} value={saved} />
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate({
              bodyHtml: html,
              expectedUpdatedAt: footer
                ? new Date(footer.updatedAt).toISOString()
                : null,
            })
          }
        >
          {save.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Save footer
        </Button>
      </CardFooter>
    </Card>
  );
}
