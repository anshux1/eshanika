import { Button } from "@eshanika/ui/components/button";
import { SearchX } from "lucide-react";
import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border bg-muted">
        <SearchX aria-hidden className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        Order not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This order doesn't exist. Check the order number and try again.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href="/orders">Back to orders</Link>}
        variant="outline"
      />
    </div>
  );
}
