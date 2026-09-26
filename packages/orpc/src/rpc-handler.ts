import { RPCHandler } from "@orpc/server/fetch";
import { router } from "./router";

const handler = new RPCHandler(router);

export async function handleRpc(request: Request): Promise<Response> {
	const { matched, response } = await handler.handle(request, {
		prefix: "/rpc",
		context: { headers: request.headers },
	});

	return matched ? response : new Response("Not found", { status: 404 });
}
