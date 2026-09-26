"use client";

import { createQueryUtils, type QueryUtils } from "@eshanika/orpc/query";
import { client } from "./client";

export const orpc: QueryUtils<typeof client> = createQueryUtils(client);
