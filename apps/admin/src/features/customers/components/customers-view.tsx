"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";

export function CustomersView() {
  const url = useUrlState();
  const search = url.get("q");
  const customers = useQuery(
    orpc.customers.list.queryOptions({
      input: { search, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = customers.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="People who shop in the store. Details are read only; customers manage them in their account."
        title="Customers"
      />
      <SearchInput
        className="sm:w-80"
        placeholder="Search by name, email, or phone"
      />

      {customers.isPending ? (
        <LoadingState rows={8} />
      ) : customers.isError ? (
        <ErrorState
          error={customers.error}
          onRetry={() => customers.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            search
              ? "No customer matches that name, email, or phone. Try part of it."
              : "Customers appear here after they create an account in the store."
          }
          title={search ? "No matches" : "No customers yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Total spent
                </TableHead>
                <TableHead className="hidden pr-4 lg:table-cell">
                  Last order
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="max-w-0 pl-4">
                    <Link
                      className="block truncate font-medium hover:underline hover:underline-offset-4"
                      href={`/customers/${customer.id}`}
                    >
                      {customer.name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.email}
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                    {customer.phoneNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {customer.orderCount}
                  </TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
                    {formatInr(customer.totalSpent)}
                  </TableCell>
                  <TableCell className="hidden pr-4 whitespace-nowrap text-muted-foreground lg:table-cell">
                    {customer.lastOrderAt
                      ? formatDate(customer.lastOrderAt)
                      : "No orders"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {customers.data ? (
        <CursorPagination nextCursor={customers.data.nextCursor} />
      ) : null}
    </div>
  );
}
