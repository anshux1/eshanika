"use client";

import { Toaster } from "@eshanika/ui/components/sonner";
import { TooltipProvider } from "@eshanika/ui/components/tooltip";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { errorCode } from "@/components/patterns/page-state";
import { ThemeProvider } from "@/components/theme-provider";

// An ended session fails every call, so send the admin to sign in and back.
function redirectWhenSignedOut(error: unknown) {
  if (errorCode(error) !== "UNAUTHORIZED") return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/sign-in?next=${encodeURIComponent(next)}`);
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: redirectWhenSignedOut }),
    mutationCache: new MutationCache({ onError: redirectWhenSignedOut }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster closeButton position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
