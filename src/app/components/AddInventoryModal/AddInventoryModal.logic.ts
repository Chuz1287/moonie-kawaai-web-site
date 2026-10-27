import type { InventoryItem } from "../InventoryDashboard.logic";}

export interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<InventoryItem, "id" | "slug" | "gallery" | "featured"> & { series?: string }) => Promise<void>;
}
