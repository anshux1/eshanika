"use client";

import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <ErrorScreen
      code="500"
      description="Something broke while loading this page. Try again, and if it keeps happening, let the team know."
      onRetry={retry}
      title="Something went wrong"
    />
  );
}
