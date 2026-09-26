import { os } from "@orpc/server";

export type RequestContext = {
	headers: Headers;
	requestId: string;
};

export const publicProcedure = os.$context<RequestContext>();
