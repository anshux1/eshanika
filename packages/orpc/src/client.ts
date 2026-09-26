import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { Router, RouterClient } from "@orpc/server";
import type { RequestContext } from "./base";

// Browser client for an app's own `/rpc` route. Pass the router as a type only so no server code is bundled.
export function createClient<
	TRouter extends Router<RequestContext>,
>(): RouterClient<TRouter> {
	const link = new RPCLink({
		origin: () => globalThis.location.origin,
		url: "/rpc",
	});
	return createORPCClient(link);
}
