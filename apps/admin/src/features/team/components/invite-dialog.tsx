"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@eshanika/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { createInvitationSchema } from "@/features/team/schema";
import { orpc } from "@/orpc/query";
import type { IssuedInvite } from "./invite-link-dialog";
import { RolePicker } from "./role-picker";

type Values = z.input<typeof createInvitationSchema>;

export function InviteDialog({
  onIssued,
}: {
  onIssued: (invite: IssuedInvite) => void;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: "", role: "editor" },
  });
  const create = useMutation(
    orpc.team.invitations.create.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.team.key() });
        toast.success(`Invitation created for ${result.invitation.email}`);
        setOpen(false);
        form.reset();
        onIssued({
          email: result.invitation.email,
          invitationUrl: result.invitationUrl,
          emailSent: result.emailSent,
        });
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
    }),
  );
  const { errors } = form.formState;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden />
        Invite member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            create.mutate(createInvitationSchema.parse(values)),
          )}
        >
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They get a link that works for 7 days. Choose what they can
              manage.
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
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
              <Input
                aria-invalid={!!errors.email}
                autoComplete="off"
                id="invite-email"
                placeholder="name@example.com"
                type="email"
                {...form.register("email")}
              />
              <FieldError
                errors={[
                  errors.email
                    ? { message: "Enter a valid email address" }
                    : undefined,
                ]}
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <RolePicker onChange={field.onChange} value={field.value} />
                )}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              disabled={create.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={create.isPending} type="submit">
              {create.isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
