import { onError, type Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { RequestContext } from "./base";

// Every app mounts its own router at `/rpc` with the same request ID, logging, and cache headers.
export function createRpcHandler(router: Router<RequestContext>) {
	const handler = new RPCHandler<RequestContext>(router, {
		interceptors: [
			onError((error, { context }) => {
				console.error(`[rpc] request ${context.requestId} failed`, error);
			}),
		],
	});

	return async function handleRpc(request: Request): Promise<Response> {
		const requestId = crypto.randomUUID();
		const { matched, response } = await handler.handle(request, {
			prefix: "/rpc",
			context: { headers: request.headers, requestId },
		});

		const result = matched
			? response
			: new Response("Not found", { status: 404 });
		result.headers.set("x-request-id", requestId);
		result.headers.set("cache-control", "no-store");
		return result;
	};
}
