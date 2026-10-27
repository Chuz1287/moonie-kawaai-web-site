import type { InventoryItem } from "../InventoryDashboard.logic";

export interface InventoryCardProps {
  item: InventoryItem;
  onAddStock: (productId: string, quantity: number) => void;
  onDelete: (productId: string) => void;
}
