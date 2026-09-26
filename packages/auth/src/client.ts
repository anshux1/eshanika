"use client";

import { createAuthClient as createBetterAuthClient } from "better-auth/react";

export const createAuthClient = createBetterAuthClient;
export const authClient = createAuthClient();
