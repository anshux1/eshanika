import { createRpcHandler } from "@eshanika/orpc/rpc-handler";
import { router } from "./router";

export const handleRpc = createRpcHandler(router);
