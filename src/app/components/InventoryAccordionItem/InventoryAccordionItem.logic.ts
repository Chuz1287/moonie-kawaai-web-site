import type { InventoryItem } from "../InventoryDashboard.logic";

export interface InventoryAccordionItemProps {
  item: InventoryItem;
  isExpanded: boolean;
  onToggle: () => void;
  onAddStock: (productId: string, quantity: number) => void;
  onDelete: (productId: string) => void;
}
