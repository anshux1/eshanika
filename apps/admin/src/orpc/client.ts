"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { router } from "./router";

const link = new RPCLink({
	origin: () => globalThis.location.origin,
	url: "/rpc",
});

export const client: RouterClient<typeof router> = createORPCClient(link);
