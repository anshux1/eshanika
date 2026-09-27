"use client";

import { ErrorScreen } from "@/components/error-screen";
import "./globals.css";

// Replaces the root layout when it fails, so it brings its own html and body.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html className="h-full antialiased" lang="en">
      <body className="flex min-h-full flex-col font-sans">
        <ErrorScreen
          code="500"
          description="The admin couldn't load. Try again, and if it keeps happening, let the team know."
          onRetry={retry}
          title="Something went wrong"
        />
      </body>
    </html>
  );
}
