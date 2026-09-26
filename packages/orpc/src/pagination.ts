import * as z from "zod";

export const paginationInput = z.object({
	limit: z.int().min(1).max(100).default(25),
	cursor: z.string().min(1).max(1024).optional(),
});

export type Page<T> = {
	items: T[];
	nextCursor: string | null;
};
