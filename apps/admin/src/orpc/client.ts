"use client";

import { createClient } from "@eshanika/orpc/client";
import type { router } from "./router";

export const client = createClient<typeof router>();
