"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { slugify } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { PAGE_STATUS, PageStatusBadge } from "./content-badges";
import { RichTextEditor } from "./rich-text-editor";

type ContentPage = RouterOutputs["content"]["pages"]["get"];

const pageFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the page a title")
    .max(200, "Keep the title under 200 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug")
    .max(120, "Keep the slug under 120 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and dashes",
    ),
  bodyHtml: z.string(),
  status: z.enum(["draft", "published", "private", "archived"]),
});

type PageFormValues = z.input<typeof pageFormSchema>;

function defaultsFor(page: ContentPage | null): PageFormValues {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    bodyHtml: page?.bodyHtml ?? "",
    status: page?.status ?? "draft",
  };
}

export function PageEditor({
  initialPage,
}: {
  initialPage: ContentPage | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(initialPage);
  const [previewing, setPreviewing] = useState(false);
  // New pages follow the title until someone edits the slug by hand.
  const [slugTouched, setSlugTouched] = useState(initialPage !== null);
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: defaultsFor(initialPage),
  });
  const { errors, isDirty } = form.formState;
  useUnsavedChanges(isDirty);
  const onError = (error: unknown) =>
    form.setError("root", { message: errorMessage(error) });

  const create = useMutation(
    orpc.content.pages.create.mutationOptions({
      onSuccess: (saved) => {
        form.reset(defaultsFor(saved));
        void queryClient.invalidateQueries({ queryKey: orpc.content.key() });
        toast.success(`${saved.title} saved`);
        router.replace(`/content/pages/${saved.id}`);
      },
      onError,
    }),
  );
  const update = useMutation(
    orpc.content.pages.update.mutationOptions({
      onSuccess: (saved) => {
        setPage(saved);
        // The server cleans the HTML, so the editor shows what was stored.
        form.reset(defaultsFor(saved));
        void queryClient.invalidateQueries({ queryKey: orpc.content.key() });
        toast.success(
          saved.status === "published"
            ? `${saved.title} is live`
            : "Page saved",
        );
      },
      onError,
    }),
  );
  const pending = create.isPending || update.isPending;
  const status = form.watch("status");

  return (
    <form
      className="mx-auto w-full max-w-6xl"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const input = pageFormSchema.parse(values);
        if (!page) return create.mutate(input);
        update.mutate({
          ...input,
          id: page.id,
          expectedUpdatedAt: new Date(page.updatedAt).toISOString(),
        });
      })}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Back to pages"
            nativeButton={false}
            render={
              <Link href="/content/pages">
                <ArrowLeft aria-hidden />
              </Link>
            }
            size="icon"
            variant="outline"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {page ? page.title : "New page"}
              </h1>
              {page ? <PageStatusBadge status={page.status} /> : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {page ? `/${page.slug}` : "Write it as a draft, then publish."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            onClick={() => setPreviewing(true)}
            type="button"
            variant="outline"
          >
            <Eye aria-hidden />
            Preview
          </Button>
          <Button
            disabled={pending || (page !== null && !isDirty)}
            type="submit"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {page ? "Save changes" : "Save page"}
          </Button>
        </div>
      </div>

      {errors.root ? (
        <p
          className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errors.root.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0">
          <CardContent>
            <FieldGroup className="gap-5">
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="page-title">Title</FieldLabel>
                <Input
                  aria-invalid={!!errors.title}
                  id="page-title"
                  placeholder="About us"
                  {...form.register("title", {
                    onChange: (event) => {
                      if (!slugTouched)
                        form.setValue("slug", slugify(event.target.value), {
                          shouldDirty: true,
                        });
                    },
                  })}
                />
                <FieldError errors={[errors.title]} />
              </Field>
              <Field data-invalid={!!errors.bodyHtml}>
                <FieldLabel htmlFor="page-body">Content</FieldLabel>
                <Controller
                  control={form.control}
                  name="bodyHtml"
                  render={({ field }) => (
                    <RichTextEditor
                      id="page-body"
                      onChange={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <FieldDescription>
                  Pasted scripts, styles, and embeds are removed when you save.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>{PAGE_STATUS[status].hint}.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="page-status">Status</FieldLabel>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <SimpleSelect
                      id="page-status"
                      onChange={field.onChange}
                      options={Object.entries(PAGE_STATUS).map(
                        ([value, badge]) => ({
                          value: value as keyof typeof PAGE_STATUS,
                          label: badge.label,
                        }),
                      )}
                      value={field.value}
                    />
                  )}
                />
                {page && page.menuLinkCount > 0 ? (
                  <FieldDescription>
                    A menu links here, so remove that link before archiving.
                  </FieldDescription>
                ) : null}
              </Field>
              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="page-slug">Slug</FieldLabel>
                <Input
                  aria-invalid={!!errors.slug}
                  id="page-slug"
                  {...form.register("slug", {
                    onChange: () => setSlugTouched(true),
                  })}
                />
                <FieldDescription>
                  The page's address on the store.
                </FieldDescription>
                <FieldError errors={[errors.slug]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <Dialog onOpenChange={setPreviewing} open={previewing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <PagePreview
            html={form.getValues("bodyHtml")}
            title={form.getValues("title")}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}

// The editor only produces allowlisted markup, and saved HTML is cleaned on the server.
export function PagePreview({ title, html }: { title?: string; html: string }) {
  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      {title ? <h1>{title}</h1> : null}
      {html ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: editor and server both restrict this markup
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-muted-foreground">Nothing written yet.</p>
      )}
    </article>
  );
}
