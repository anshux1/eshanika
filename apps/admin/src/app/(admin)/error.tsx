"use client";

import { Button } from "@eshanika/ui/components/button";
import { CircleAlert, RotateCw } from "lucide-react";

export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-16 text-center"
      role="alert"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-destructive/30 bg-destructive/5">
        <CircleAlert aria-hidden className="size-6 text-destructive" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        This page didn't load
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something broke while loading it. Try again, and if it keeps happening,
        let the team know.
      </p>
      <Button className="mt-6" onClick={retry}>
        <RotateCw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
