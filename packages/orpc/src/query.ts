import type { AnyNestedClient } from "@orpc/client";
import {
	createTanstackQueryUtils,
	type RouterUtils,
} from "@orpc/tanstack-query";

export function createQueryUtils<TClient extends AnyNestedClient>(
	client: TClient,
): RouterUtils<TClient> {
	return createTanstackQueryUtils(client);
}

export type QueryUtils<TClient extends AnyNestedClient> = RouterUtils<TClient>;
