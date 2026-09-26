import { authRouter } from "@/features/auth/router";
import { healthRouter } from "@/features/health/router";

export const router = {
  auth: authRouter,
  health: healthRouter,
};
