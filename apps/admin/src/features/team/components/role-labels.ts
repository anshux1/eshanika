import type { AdminRole } from "@eshanika/database/enums";

export const ROLE_OPTIONS: Array<{
  value: AdminRole;
  label: string;
  description: string;
}> = [
  {
    value: "owner",
    label: "Owner",
    description: "Full access, including team, payments, and settings.",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Manages the catalogue, inventory, and content.",
  },
  {
    value: "support",
    label: "Support",
    description: "Handles orders, customers, and payments.",
  },
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  editor: "Editor",
  support: "Support",
};
