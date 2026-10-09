"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MultiSelect } from "@/components/patterns/multi-select";
import { errorMessage } from "@/components/patterns/page-state";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { INDIAN_STATES } from "../indian-states";

export type Zone = RouterOutputs["shipping"]["zones"]["list"][number];

const zoneFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the zone")
    .max(120, "Keep the name under 120 characters"),
  states: z.array(z.enum(INDIAN_STATES)),
});

const STATE_ITEMS = INDIAN_STATES.map((state) => ({ id: state, label: state }));

export function ZoneDialog({
  zone,
  onClose,
}: {
  zone: Zone | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof zoneFormSchema>>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: zone?.name ?? "",
      states: (zone?.states ?? []) as (typeof INDIAN_STATES)[number][],
    },
  });
  const { errors } = form.formState;
  const options = {
    onError: (error: unknown) =>
      form.setError("root", { message: errorMessage(error) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: orpc.shipping.key() }),
  };
  const create = useMutation(
    orpc.shipping.zones.create.mutationOptions({
      ...options,
      onSuccess: (saved) => {
        toast.success(
          `${saved.name} added. Turn it on when its methods are ready.`,
        );
        onClose();
      },
    }),
  );
  const update = useMutation(
    orpc.shipping.zones.update.mutationOptions({
      ...options,
      onSuccess: () => {
        toast.success("Zone saved");
        onClose();
      },
    }),
  );
  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const parsed = zoneFormSchema.parse(values);
            if (!zone) return create.mutate(parsed);
            update.mutate({
              ...parsed,
              id: zone.id,
              enabled: zone.enabled,
              expectedUpdatedAt: new Date(zone.updatedAt).toISOString(),
            });
          })}
        >
          <DialogHeader>
            <DialogTitle>{zone ? `Edit ${zone.name}` : "New zone"}</DialogTitle>
            <DialogDescription>
              A zone groups the states that share the same shipping methods.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-5">
            {errors.root ? (
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errors.root.message}
              </p>
            ) : null}
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="zone-name">Name</FieldLabel>
              <Input
                aria-invalid={!!errors.name}
                id="zone-name"
                placeholder="South India"
                {...form.register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="zone-states">States</FieldLabel>
              <Controller
                control={form.control}
                name="states"
                render={({ field }) => (
                  <MultiSelect
                    emptyText="No state matches"
                    id="zone-states"
                    items={STATE_ITEMS}
                    onChange={field.onChange}
                    placeholder="Every state not in another zone"
                    value={field.value}
                  />
                )}
              />
              <FieldDescription>
                Leave empty to cover every state no other zone lists. Only one
                zone can do that.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {zone ? "Save zone" : "Add zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
