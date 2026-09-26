import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import { z } from "zod";

export const externalRouter = {
	status: os
		.meta(openapi({ method: "GET", path: "/status", summary: "API status" }))
		.output(z.object({ status: z.literal("ok") }))
		.handler(async () => ({ status: "ok" as const })),
};
