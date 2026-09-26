"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "@/components/patterns/page-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { orpc } from "@/orpc/query";

export function BrowserHealthCheck() {
  const ping = useQuery(orpc.health.ping.queryOptions());

  if (ping.isPending) return <LoadingState rows={1} />;
  if (ping.isError)
    return <ErrorState error={ping.error} onRetry={() => ping.refetch()} />;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">Browser to API</span>
      <StatusBadge tone="success">Connected</StatusBadge>
    </div>
  );
}
