import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const databaseEnv = createEnv({
	server: {
		DATABASE_URL: z.url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
