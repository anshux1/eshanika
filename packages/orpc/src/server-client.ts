import {
	createRouterClient,
	type InferRouterInitialContext,
	type Router,
	type RouterClient,
} from "@orpc/server";
import type { RequestContext } from "./base";

// Lets Server Components call procedures in-process instead of making an HTTP request to their own server.
export function createServerClient<TRouter extends Router<RequestContext>>(
	router: TRouter,
	headers: Headers,
): RouterClient<TRouter> {
	return createRouterClient(router, {
		// TypeScript can't resolve the context of a generic router; the constraint guarantees it is RequestContext.
		context: {
			headers,
			requestId: crypto.randomUUID(),
		} satisfies RequestContext as InferRouterInitialContext<TRouter>,
	});
}
