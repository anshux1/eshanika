"use client";

import type { ProductStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  CircleCheck,
  CircleDashed,
  Rocket,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { errorCode, errorMessage } from "@/components/patterns/page-state";
import { formatDateTime } from "@/lib/format";
import { rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { ProductDetail, ProductFormValues } from "./product-form-model";
import { ProductStatusBadge } from "./product-status-badge";

const MONEY = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function salesValid(variants: ProductFormValues["variants"]) {
  return variants.every((variant) => {
    if (variant.salePrice) {
      if (!MONEY.test(variant.salePrice) || !MONEY.test(variant.regularPrice)) {
        return false;
      }
      if (
        rupeesToPaise(variant.salePrice) >= rupeesToPaise(variant.regularPrice)
      ) {
        return false;
      }
    }
    return !(
      variant.saleStartsAt &&
      variant.saleEndsAt &&
      variant.saleEndsAt <= variant.saleStartsAt
    );
  });
}

type Transition = {
  status: ProductStatus;
  label: string;
  confirm?: { title: string; description: string };
};

export function StatusCard({
  product,
  revision,
  formDirty,
  onChanged,
  onConflict,
}: {
  product: ProductDetail | null;
  revision: string | null;
  formDirty: boolean;
  onChanged: (product: ProductDetail) => void;
  onConflict: () => void;
}) {
  const form = useFormContext<ProductFormValues>();
  const variants = form.watch("variants");
  const productType = form.watch("productType");
  const [confirming, setConfirming] = useState<Transition | null>(null);
  const media = useQuery({
    ...orpc.catalog.media.getProductMedia.queryOptions({
      input: { productId: product?.id ?? "" },
    }),
    enabled: product !== null,
  });
  const primary = media.data?.items.find((item) => item.role === "primary");

  const checks = [
    {
      label: "At least one priced variant",
      done: variants.some((variant) => MONEY.test(variant.regularPrice)),
    },
    {
      label: "Exactly one default variant",
      done:
        productType === "simple"
          ? variants.length === 1
          : variants.filter((variant) => variant.isDefault).length === 1,
    },
    { label: "Valid sale prices and dates", done: salesValid(variants) },
    {
      label: "Primary image with alt text",
      done: Boolean(primary?.altText?.trim()),
    },
  ];
  const ready = checks.every((check) => check.done);

  const setStatus = useMutation(
    orpc.catalog.products.setStatus.mutationOptions({
      onSuccess: (updated) => {
        toast.success(
          updated.status === "active"
            ? "Product published"
            : updated.status === "archived"
              ? "Product archived"
              : "Product moved to draft",
        );
        setConfirming(null);
        onChanged(updated);
      },
      onError: (error) => {
        setConfirming(null);
        toast.error(errorMessage(error), {
          action:
            errorCode(error) === "CONFLICT"
              ? { label: "Reload", onClick: onConflict }
              : undefined,
        });
      },
    }),
  );

  function run(transition: Transition) {
    if (!product || !revision) return;
    setStatus.mutate({
      id: product.id,
      status: transition.status,
      expectedUpdatedAt: revision,
    });
  }

  const archive: Transition = {
    status: "archived",
    label: "Archive",
    confirm: {
      title: "Archive this product?",
      description:
        "It's removed from the store. Orders keep their history. You can restore it to draft later.",
    },
  };
  const transitions: Transition[] =
    product?.status === "draft"
      ? [{ status: "active", label: "Publish" }, archive]
      : product?.status === "active"
        ? [archive]
        : product?.status === "archived"
          ? [{ status: "draft", label: "Restore to draft" }]
          : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Status
          <ProductStatusBadge status={product?.status ?? "draft"} />
        </CardTitle>
        <CardDescription>
          {product?.publishedAt && product.status === "active"
            ? `Live since ${formatDateTime(product.publishedAt)}`
            : product
              ? "Drafts are hidden from shoppers."
              : "New products start as drafts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {product?.status !== "archived" ? (
          <ul className="space-y-2 text-sm">
            {checks.map((check) => (
              <li className="flex items-center gap-2" key={check.label}>
                {check.done ? (
                  <CircleCheck
                    aria-hidden
                    className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <CircleDashed
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                )}
                <span className={cn(!check.done && "text-muted-foreground")}>
                  {check.label}
                  <span className="sr-only">
                    {check.done ? " (done)" : " (to do)"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {transitions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {transitions.map((transition) => {
              const Icon =
                transition.status === "active"
                  ? Rocket
                  : transition.status === "archived"
                    ? Archive
                    : Undo2;
              return (
                <Button
                  className={
                    transition.status === "active" ? "flex-1" : undefined
                  }
                  disabled={
                    formDirty ||
                    setStatus.isPending ||
                    (transition.status === "active" && !ready)
                  }
                  key={transition.status}
                  onClick={() =>
                    transition.confirm
                      ? setConfirming(transition)
                      : run(transition)
                  }
                  type="button"
                  variant={
                    transition.status === "archived" ? "outline" : "default"
                  }
                >
                  <Icon aria-hidden />
                  {transition.label}
                </Button>
              );
            })}
          </div>
        ) : null}
        {formDirty && product ? (
          <p className="text-xs text-muted-foreground">
            Save your changes before changing the status.
          </p>
        ) : null}
      </CardContent>
      <ConfirmDialog
        confirmLabel={confirming?.label ?? ""}
        description={confirming?.confirm?.description ?? ""}
        destructive
        onConfirm={() => {
          if (confirming) run(confirming);
        }}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        open={confirming !== null}
        pending={setStatus.isPending}
        title={confirming?.confirm?.title ?? ""}
      />
    </Card>
  );
}
