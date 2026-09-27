"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorCode,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { type Tag, TagDialog } from "./tag-dialog";

export function TagsView() {
  const url = useUrlState();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = url.get("q");
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const tags = useQuery(
    orpc.catalog.tags.list.queryOptions({
      input: { cursor: url.get("cursor"), search, limit: 25 },
    }),
  );

  const remove = useMutation(
    orpc.catalog.tags.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${deleting?.name ?? "Tag"} deleted`);
        setDeleting(null);
      },
      onError: (error) => {
        const tag = deleting;
        toast.error(errorMessage(error), {
          action:
            errorCode(error) === "CONFLICT" && tag
              ? {
                  label: "View products",
                  onClick: () => router.push(`/products?tagId=${tag.id}`),
                }
              : undefined,
        });
        setDeleting(null);
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: orpc.catalog.tags.key() }),
    }),
  );

  const newButton = (
    <Button onClick={() => setEditing("new")}>
      <Plus aria-hidden />
      New tag
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Label products for collections, search, and filters."
        title="Tags"
      />
      <SearchInput placeholder="Search tags" />
      {tags.isPending ? (
        <LoadingState />
      ) : tags.isError ? (
        <ErrorState error={tags.error} onRetry={() => tags.refetch()} />
      ) : tags.data.items.length === 0 ? (
        <EmptyState
          action={search ? undefined : newButton}
          description={
            search
              ? "No tag matches that search."
              : "Create a tag to group related products."
          }
          title={search ? "No matches" : "No tags yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Description
                </TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="hidden sm:table-cell">Updated</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.data.items.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{tag.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {tag.slug}
                    </p>
                  </TableCell>
                  <TableCell className="hidden max-w-72 truncate text-muted-foreground lg:table-cell">
                    {tag.description || "—"}
                  </TableCell>
                  <TableCell>
                    {tag.productCount > 0 ? (
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/products?tagId=${tag.id}`}
                      >
                        {tag.productCount}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(tag.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            aria-label={`Actions for ${tag.name}`}
                            size="icon-sm"
                            variant="ghost"
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditing(tag)}>
                          <Pencil aria-hidden />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleting(tag)}
                          variant="destructive"
                        >
                          <Trash2 aria-hidden />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {tags.data ? (
        <CursorPagination nextCursor={tags.data.nextCursor} />
      ) : null}

      {editing ? (
        <TagDialog
          key={editing === "new" ? "new" : editing.id}
          onClose={() => setEditing(null)}
          tag={editing === "new" ? null : editing}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleting && deleting.productCount > 0
            ? `It's on ${deleting.productCount} product${deleting.productCount === 1 ? "" : "s"}. Remove it from them before deleting.`
            : "This can't be undone."
        }
        destructive
        onConfirm={() => {
          if (deleting) {
            remove.mutate({
              id: deleting.id,
              expectedUpdatedAt: deleting.updatedAt,
            });
          }
        }}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        open={deleting !== null}
        pending={remove.isPending}
        title={`Delete ${deleting?.name ?? ""}?`}
      />
    </div>
  );
}
