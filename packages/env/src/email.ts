import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const emailEnv = createEnv({
	server: {
		// Optional so development works before Resend is configured.
		RESEND_API_KEY: z.string().min(1).optional(),
		EMAIL_FROM: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
