import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { databaseEnv } from "./database";

export const authEnv = createEnv({
	extends: [databaseEnv],
	server: {
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
