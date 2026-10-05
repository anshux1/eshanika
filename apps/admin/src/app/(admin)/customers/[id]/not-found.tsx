import { Button } from "@eshanika/ui/components/button";
import { SearchX } from "lucide-react";
import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border bg-muted">
        <SearchX aria-hidden className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        Customer not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This customer doesn't exist, or the account belongs to an admin.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href="/customers">Back to customers</Link>}
        variant="outline"
      />
    </div>
  );
}
