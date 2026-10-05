"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@eshanika/ui/components/combobox";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";

type VariantItem = { id: string; label: string; sku: string };

// Shares its key with `inventory.list`, so stock changes refresh it too.
function useAllStockVariants() {
  const input = { limit: 100, stock: "all" as const };
  return useQuery({
    ...orpc.inventory.list.queryOptions({ input }),
    queryFn: () =>
      fetchAllPages((cursor) => client.inventory.list({ ...input, cursor })),
  });
}

export function VariantFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (variantId: string | null) => void;
}) {
  const variants = useAllStockVariants();
  const items: VariantItem[] = (variants.data?.items ?? []).map((row) => ({
    id: row.id,
    sku: row.sku,
    label:
      row.name === row.productName
        ? row.productName
        : `${row.productName} · ${row.name}`,
  }));
  const selected = items.find((item) => item.id === value) ?? null;

  return (
    <Combobox
      autoHighlight
      isItemEqualToValue={(item, current) => item.id === current.id}
      itemToStringLabel={(item: VariantItem) => item.label}
      items={items}
      onValueChange={(next: VariantItem | null) => onChange(next?.id ?? null)}
      value={selected}
    >
      <ComboboxInput
        aria-label="Filter by variant"
        className="w-full"
        placeholder={
          value && !selected && variants.isPending
            ? "Loading variant…"
            : "All variants"
        }
        showClear={selected !== null}
      />
      <ComboboxContent>
        <ComboboxEmpty>No tracked variant matches.</ComboboxEmpty>
        <ComboboxList>
          {(item: VariantItem) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {item.sku}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
