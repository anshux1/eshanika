"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";

type Status = "active" | "archived";

// Whole lists share their keys with the list procedures, so invalidating
// `orpc.catalog.categories.key()` after a change refreshes these too.
export function useAllCategories(status: Status = "active") {
  const input = { limit: 100, status };
  return useQuery({
    ...orpc.catalog.categories.list.queryOptions({ input }),
    queryFn: () =>
      fetchAllPages((cursor) =>
        client.catalog.categories.list({ ...input, cursor }),
      ),
  });
}

export function useAllAttributes(status: Status = "active", search?: string) {
  const input = { limit: 100, status, search };
  return useQuery({
    ...orpc.catalog.attributes.list.queryOptions({ input }),
    queryFn: () =>
      fetchAllPages((cursor) =>
        client.catalog.attributes.list({ ...input, cursor }),
      ),
  });
}

export function allOptionsQueryOptions(
  attributeId: string,
  status: Status = "active",
) {
  const input = { limit: 100, status, attributeId };
  return queryOptions({
    queryKey: orpc.catalog.attributes.options.list.queryKey({ input }),
    queryFn: () =>
      fetchAllPages((cursor) =>
        client.catalog.attributes.options.list({ ...input, cursor }),
      ),
  });
}

export function useAllOptions(
  attributeId: string | null,
  status: Status = "active",
) {
  return useQuery({
    ...allOptionsQueryOptions(attributeId ?? "", status),
    enabled: attributeId !== null,
  });
}

export function useAllTags() {
  const input = { limit: 100 };
  return useQuery({
    ...orpc.catalog.tags.list.queryOptions({ input }),
    queryFn: () =>
      fetchAllPages((cursor) => client.catalog.tags.list({ ...input, cursor })),
  });
}
