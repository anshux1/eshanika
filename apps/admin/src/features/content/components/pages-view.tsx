"use client";

import type { ContentEntryStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { PAGE_STATUS, PageStatusBadge } from "./content-badges";

export function PagesView() {
  const url = useUrlState();
  const search = url.get("q");
  const rawStatus = url.get("status");
  const status =
    rawStatus && rawStatus in PAGE_STATUS
      ? (rawStatus as ContentEntryStatus)
      : undefined;
  const pages = useQuery(
    orpc.content.pages.list.queryOptions({
      input: { search, status, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = pages.data?.items ?? [];
  const filtered = Boolean(search || status);
  const newButton = (
    <Button
      nativeButton={false}
      render={
        <Link href="/content/pages/new">
          <Plus aria-hidden />
          New page
        </Link>
      }
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Store pages like About, Shipping policy, and Contact, most recently edited first."
        title="Pages"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          className="sm:w-80"
          placeholder="Search by title or slug"
        />
        <SimpleSelect
          aria-label="Filter by status"
          className="sm:w-44"
          onChange={(next) => url.set({ status: next === "all" ? null : next })}
          options={[
            { value: "all", label: "All statuses" },
            ...Object.entries(PAGE_STATUS).map(([value, badge]) => ({
              value,
              label: badge.label,
            })),
          ]}
          value={status ?? "all"}
        />
      </div>
      {pages.isPending ? (
        <LoadingState rows={6} />
      ) : pages.isError ? (
        <ErrorState error={pages.error} onRetry={() => pages.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          action={filtered ? undefined : newButton}
          description={
            filtered
              ? "No page matches these filters."
              : "Write your first store page."
          }
          title={filtered ? "No matches" : "No pages yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4">Page</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="max-w-0 pl-4">
                    <Link
                      className="block truncate font-medium hover:underline hover:underline-offset-4"
                      href={`/content/pages/${page.id}`}
                    >
                      {page.title}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      /{page.slug}
                      {page.menuLinkCount > 0
                        ? ` · In ${page.menuLinkCount} menu link${page.menuLinkCount === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground md:table-cell">
                    {formatDateTime(page.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <PageStatusBadge status={page.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pages.data ? (
        <CursorPagination nextCursor={pages.data.nextCursor} />
      ) : null}
    </div>
  );
}
