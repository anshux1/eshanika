import type { Page } from "@eshanika/orpc/pagination";

// For short lists that screens need whole, such as the category tree and
// product form pickers. Each request uses the largest page size.
export async function fetchAllPages<T>(
  load: (cursor: string | undefined) => Promise<Page<T>>,
): Promise<Page<T>> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return { items, nextCursor: null };
}
