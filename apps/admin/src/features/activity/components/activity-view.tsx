"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import {
  DateRangeFilter,
  useDateRange,
} from "@/components/patterns/date-range-filter";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { StatusBadge } from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime, istDayEnd, istDayStart } from "@/lib/format";
import { orpc } from "@/orpc/query";

function Changes({ before, after }: { before: unknown; after: unknown }) {
  if (before == null && after == null) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-muted-foreground">
        Details
      </summary>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {[
          ["Before", before],
          ["After", after],
        ].map(([label, value]) =>
          value == null ? null : (
            <div key={String(label)}>
              <p className="font-medium">{String(label)}</p>
              <pre className="mt-0.5 overflow-x-auto rounded-md bg-muted/60 p-2 whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ),
        )}
      </div>
    </details>
  );
}

export function ActivityView() {
  const url = useUrlState();
  const { from, to, reversed } = useDateRange();
  const action = url.get("q");
  const actorUserId = url.get("actor");
  const entityType = url.get("entity");
  const filters = useQuery(orpc.activity.filters.queryOptions());
  const activity = useQuery({
    ...orpc.activity.list.queryOptions({
      input: {
        action,
        actorUserId,
        entityType,
        from: from ? istDayStart(from) : undefined,
        to: to ? istDayEnd(to) : undefined,
        cursor: url.get("cursor"),
        limit: 50,
      },
    }),
    enabled: !reversed,
  });
  const items = activity.data?.items ?? [];
  const filtered = Boolean(action || actorUserId || entityType || from || to);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Every change made in the admin, newest first. Passwords, tokens, and payment details are never recorded."
        title="Activity"
      />
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,20rem)] lg:items-end">
        <SearchInput
          className="sm:w-full"
          placeholder="Search actions, like orders.cancel"
        />
        <SimpleSelect
          aria-label="Filter by person"
          disabled={!filters.data}
          onChange={(next) => url.set({ actor: next === "all" ? null : next })}
          options={[
            { value: "all", label: "Everyone" },
            ...(filters.data?.actors ?? []).map((actor) => ({
              value: actor.id,
              label: actor.name,
            })),
          ]}
          value={actorUserId ?? "all"}
        />
        <SimpleSelect
          aria-label="Filter by record type"
          disabled={!filters.data}
          onChange={(next) => url.set({ entity: next === "all" ? null : next })}
          options={[
            { value: "all", label: "All record types" },
            ...(filters.data?.entityTypes ?? []).map((type) => ({
              value: type,
              label: type,
            })),
          ]}
          value={entityType ?? "all"}
        />
        <div className="sm:col-span-3 lg:col-span-1">
          <DateRangeFilter />
        </div>
      </div>
      {reversed ? null : activity.isPending ? (
        <LoadingState rows={8} />
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            filtered
              ? "No activity matches these filters."
              : "Changes show up here as the team works."
          }
          title={filtered ? "No matches" : "No activity yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4">Change</TableHead>
                <TableHead className="hidden md:table-cell">By</TableHead>
                <TableHead className="pr-4 text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="max-w-0 pl-4 align-top">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm">
                        {entry.action}
                      </span>
                      {entry.outcome === "failure" ? (
                        <StatusBadge tone="danger">Failed</StatusBadge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.entityType} · {entry.entityId}
                      <span className="md:hidden">
                        {" "}
                        · {entry.actorName ?? "System"}
                      </span>
                    </p>
                    {entry.reason ? (
                      <p className="text-xs">{entry.reason}</p>
                    ) : null}
                    <Changes
                      after={entry.afterData}
                      before={entry.beforeData}
                    />
                  </TableCell>
                  <TableCell className="hidden align-top whitespace-nowrap md:table-cell">
                    {entry.actorName ?? "System"}
                    {entry.actorAdminRole ? (
                      <span className="block text-xs text-muted-foreground capitalize">
                        {entry.actorAdminRole}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="pr-4 text-right align-top text-sm whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {activity.data && !reversed ? (
        <CursorPagination nextCursor={activity.data.nextCursor} />
      ) : null}
    </div>
  );
}
