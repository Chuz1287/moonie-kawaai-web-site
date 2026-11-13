import type { InventoryItem } from "../InventoryDashboard.logic";

export interface InventoryAccordionItemProps {
  item: InventoryItem;
  onAddStock: (productId: string, quantity: number) => void;
  onDelete: (productId: string) => void;
  onEdit: () => void;
}
