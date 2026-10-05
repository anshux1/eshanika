"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { Field, FieldError, FieldLabel } from "@eshanika/ui/components/field";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { OrderDetail } from "./order-model";

const noteFormSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Write a note first")
    .max(5000, "Keep the note under 5,000 characters"),
});

export function OrderNotes({
  order,
  canWrite,
}: {
  order: OrderDetail;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { note: "" },
  });
  const addNote = useMutation(
    orpc.orders.addNote.mutationOptions({
      onSuccess: () => {
        form.reset();
        toast.success("Note added");
      },
      onError: (error) =>
        form.setError("note", { message: errorMessage(error) }),
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.orders.get.key({ input: { id: order.id } }),
        }),
    }),
  );
  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal notes</CardTitle>
        <CardDescription>Only the team sees these.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.orderNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {order.orderNotes.map((note) => (
              <li className="rounded-lg bg-muted/60 px-3 py-2" key={note.id}>
                <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.authorUser?.name ?? "Former admin"} ·{" "}
                  {formatDateTime(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canWrite ? (
          <form
            className="space-y-2"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              addNote.mutate({
                id: order.id,
                note: noteFormSchema.parse(values).note,
              }),
            )}
          >
            <Field data-invalid={!!errors.note}>
              <FieldLabel className="sr-only" htmlFor="order-note">
                New note
              </FieldLabel>
              <Textarea
                aria-invalid={!!errors.note}
                id="order-note"
                placeholder="Add a note for the team"
                rows={2}
                {...form.register("note")}
              />
              <FieldError errors={[errors.note]} />
            </Field>
            <Button
              disabled={addNote.isPending}
              size="sm"
              type="submit"
              variant="outline"
            >
              {addNote.isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              Add note
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
