import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const razorpayEnv = createEnv({
	server: {
		// Optional so development works before Razorpay is configured.
		RAZORPAY_KEY_ID: z.string().min(1).optional(),
		RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
		RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
