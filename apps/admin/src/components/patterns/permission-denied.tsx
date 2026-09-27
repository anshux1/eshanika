import { Button } from "@eshanika/ui/components/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export function PermissionDenied({ area }: { area: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border bg-muted">
        <ShieldAlert aria-hidden className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        You can't open {area}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your role doesn't include access to this area. Ask an owner if you need
        it.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href="/">Back to overview</Link>}
        variant="outline"
      />
    </div>
  );
}
