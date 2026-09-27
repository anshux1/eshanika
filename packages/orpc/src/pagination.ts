import * as z from "zod";

export const paginationInput = z.object({
	limit: z.int().min(1).max(100).default(25),
	cursor: z.string().min(1).max(1024).optional(),
});

export type Page<T> = {
	items: T[];
	nextCursor: string | null;
};

// Lists fetch `limit + 1` rows. The extra row only tells us another page exists.
export function toPage<T>(
	rows: T[],
	limit: number,
	cursorOf: (row: T) => string,
): Page<T> {
	const items = rows.slice(0, limit);
	const lastItem = items.at(-1);
	return {
		items,
		nextCursor: rows.length > limit && lastItem ? cursorOf(lastItem) : null,
	};
}
