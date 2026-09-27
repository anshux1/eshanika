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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@eshanika/ui/components/input-group";
import { Check, Copy, MailCheck, MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type IssuedInvite = {
  email: string;
  invitationUrl: string;
  emailSent: boolean;
};

// The raw link is shown once and only kept in memory, so leaving the page drops it.
export function InviteLinkDialog({
  invite,
  onClose,
}: {
  invite: IssuedInvite | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={invite !== null}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitation ready</DialogTitle>
          <DialogDescription>
            This link is shown only once. Share it privately with{" "}
            <span className="font-medium text-foreground">{invite?.email}</span>
            .
          </DialogDescription>
        </DialogHeader>
        {invite?.emailSent ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <MailCheck aria-hidden className="size-4 shrink-0" />
            We also emailed the link to them.
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            <MailWarning aria-hidden className="size-4 shrink-0" />
            The email didn't send. Copy the link and share it yourself.
          </p>
        )}
        <InputGroup>
          <InputGroupInput
            aria-label="Invitation link"
            className="font-mono text-xs"
            onFocus={(event) => event.target.select()}
            readOnly
            value={invite?.invitationUrl ?? ""}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Copy invitation link"
              onClick={() => void copy()}
              size="icon-xs"
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
