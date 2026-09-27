"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, MoreHorizontal, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { InviteDialog } from "./invite-dialog";
import { InviteLinkDialog, type IssuedInvite } from "./invite-link-dialog";
import { ROLE_LABELS } from "./role-labels";
import { TeamTabs } from "./team-tabs";

type Invitation = RouterOutputs["team"]["invitations"]["list"]["items"][number];
type InvitationState = "pending" | "expired" | "accepted" | "revoked";

const STATE_BADGES: Record<
  InvitationState,
  { tone: StatusTone; label: string }
> = {
  pending: { tone: "info", label: "Pending" },
  expired: { tone: "muted", label: "Expired" },
  accepted: { tone: "success", label: "Accepted" },
  revoked: { tone: "danger", label: "Revoked" },
};

function stateOf(invitation: Invitation): InvitationState {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (new Date(invitation.expiresAt) <= new Date()) return "expired";
  return "pending";
}

export function InvitationsView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const [issued, setIssued] = useState<IssuedInvite | null>(null);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const invitations = useQuery(
    orpc.team.invitations.list.queryOptions({
      input: { cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.team.key() });

  const resend = useMutation(
    orpc.team.invitations.resend.mutationOptions({
      onSuccess: (result) => {
        void refresh();
        toast.success(`New link created for ${result.invitation.email}`);
        setIssued({
          email: result.invitation.email,
          invitationUrl: result.invitationUrl,
          emailSent: result.emailSent,
        });
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );
  const revoke = useMutation(
    orpc.team.invitations.revoke.mutationOptions({
      onSuccess: () => {
        void refresh();
        toast.success("Invitation revoked");
        setRevoking(null);
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={<InviteDialog onIssued={setIssued} />}
        description="Invite new admins and keep track of their links."
        title="Team"
      />
      <TeamTabs />
      {invitations.isPending ? (
        <LoadingState />
      ) : invitations.isError ? (
        <ErrorState
          error={invitations.error}
          onRetry={() => invitations.refetch()}
        />
      ) : invitations.data.items.length === 0 ? (
        <EmptyState
          action={<InviteDialog onIssued={setIssued} />}
          description="Invite someone to help run the store."
          title="No invitations yet"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Invited by
                </TableHead>
                <TableHead className="hidden lg:table-cell">Expires</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.data.items.map((invitation) => {
                const state = stateOf(invitation);
                const badge = STATE_BADGES[state];
                const canResend = state === "pending" || state === "expired";
                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="max-w-56 truncate pl-4 font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
                    <TableCell>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {invitation.invitedBy.name}
                      <span className="block text-xs">
                        {formatDate(invitation.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {state === "accepted" && invitation.acceptedAt
                        ? `Accepted ${formatDate(invitation.acceptedAt)}`
                        : formatDateTime(invitation.expiresAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {canResend ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                aria-label={`Actions for ${invitation.email}`}
                                disabled={resend.isPending}
                                size="icon-sm"
                                variant="ghost"
                              />
                            }
                          >
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                resend.mutate({ id: invitation.id })
                              }
                            >
                              <Send aria-hidden />
                              Resend link
                            </DropdownMenuItem>
                            {state === "pending" ? (
                              <DropdownMenuItem
                                onClick={() => setRevoking(invitation)}
                                variant="destructive"
                              >
                                <Ban aria-hidden />
                                Revoke
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {invitations.data ? (
        <CursorPagination nextCursor={invitations.data.nextCursor} />
      ) : null}
      <ConfirmDialog
        confirmLabel="Revoke"
        description="The link stops working right away. You can send a new invitation later."
        destructive
        onConfirm={() => {
          if (revoking) revoke.mutate({ id: revoking.id });
        }}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        open={revoking !== null}
        pending={revoke.isPending}
        title={`Revoke the invitation for ${revoking?.email ?? ""}?`}
      />
      <InviteLinkDialog invite={issued} onClose={() => setIssued(null)} />
    </div>
  );
}
