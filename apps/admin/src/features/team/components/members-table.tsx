"use client";

import type {
  AdminMembershipStatus,
  AdminRole,
} from "@eshanika/database/enums";
import { Avatar, AvatarFallback } from "@eshanika/ui/components/avatar";
import { Button } from "@eshanika/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { FilterTabs } from "@/components/patterns/filter-tabs";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate, initials } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { ROLE_LABELS, ROLE_OPTIONS } from "./role-labels";

type Member = RouterOutputs["team"]["members"]["list"]["items"][number];
type Change = {
  member: Member;
  role?: AdminRole;
  status?: AdminMembershipStatus;
};

function confirmCopy({ member, role, status }: Change) {
  if (status === "suspended") {
    return {
      title: `Suspend ${member.name}?`,
      description:
        "They lose admin access right away and are signed out of the admin. You can restore access later.",
      confirmLabel: "Suspend",
      destructive: true,
    };
  }
  return {
    title: `Change ${member.name} to ${role ? ROLE_LABELS[role] : ""}?`,
    description:
      "They will no longer be an owner and lose access to team, payments, and settings.",
    confirmLabel: "Change role",
    destructive: true,
  };
}

export function MembersTable({ currentUserId }: { currentUserId: string }) {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Change | null>(null);
  const status = url.get("status") as AdminMembershipStatus | undefined;
  const members = useQuery(
    orpc.team.members.list.queryOptions({
      input: { cursor: url.get("cursor"), status, limit: 25 },
    }),
  );

  const update = useMutation(
    orpc.team.members.update.mutationOptions({
      onSuccess: (member) => {
        toast.success(`${member.name} updated`);
        setPending(null);
        void queryClient.invalidateQueries({ queryKey: orpc.team.key() });
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );

  function request(change: Change) {
    const demotesOwner =
      change.member.role === "owner" && change.role && change.role !== "owner";
    if (change.status === "suspended" || demotesOwner) {
      setPending(change);
      return;
    }
    update.mutate({
      userId: change.member.userId,
      role: change.role,
      status: change.status,
    });
  }

  return (
    <div className="space-y-4">
      <FilterTabs
        label="Filter by status"
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
        ]}
        param="status"
      />
      {members.isPending ? (
        <LoadingState />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : members.data.items.length === 0 ? (
        <EmptyState
          action={
            <Button
              nativeButton={false}
              render={<Link href="/team/invitations">Invite someone</Link>}
              variant="outline"
            />
          }
          description="Nobody matches this filter yet."
          title="No members"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.items.map((member) => {
                const isSelf = member.userId === currentUserId;
                return (
                  <TableRow key={member.userId}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {member.name}
                            {isSelf ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                    <TableCell>
                      {member.status === "active" ? (
                        <StatusBadge tone="success">Active</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Suspended</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              aria-label={`Actions for ${member.name}`}
                              disabled={update.isPending}
                              size="icon-sm"
                              variant="ghost"
                            />
                          }
                        >
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Role</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              onValueChange={(role) =>
                                request({ member, role: role as AdminRole })
                              }
                              value={member.role}
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          {member.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                request({ member, status: "suspended" })
                              }
                              variant="destructive"
                            >
                              <UserX aria-hidden />
                              Suspend access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                request({ member, status: "active" })
                              }
                            >
                              <UserCheck aria-hidden />
                              Restore access
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {members.data ? (
        <CursorPagination nextCursor={members.data.nextCursor} />
      ) : null}
      {pending ? (
        <ConfirmDialog
          {...confirmCopy(pending)}
          onConfirm={() =>
            update.mutate({
              userId: pending.member.userId,
              role: pending.role,
              status: pending.status,
            })
          }
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          open
          pending={update.isPending}
        />
      ) : null}
    </div>
  );
}
