import { StatusBadge } from "@/components/patterns/status-badge";

export function StockLevelBadge({
  available,
  reorderPoint,
}: {
  available: number;
  reorderPoint: number;
}) {
  if (available <= 0)
    return <StatusBadge tone="danger">Out of stock</StatusBadge>;
  if (available <= reorderPoint)
    return <StatusBadge tone="warning">Low stock</StatusBadge>;
  return <StatusBadge tone="success">In stock</StatusBadge>;
}
