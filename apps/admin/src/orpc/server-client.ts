import { createServerClient } from "@eshanika/orpc/server-client";
import { headers } from "next/headers";
import { router } from "./router";

export async function getServerClient() {
  return createServerClient(router, await headers());
}
