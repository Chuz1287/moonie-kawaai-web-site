import type { InventoryItem } from "../InventoryDashboard.logic";

export type InventoryFormValues = Omit<
  InventoryItem,
  "id" | "slug" | "gallery" | "featured" | "coverImage"
> & {
  code: string;
  series: string;
};

export interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: InventoryItem;
  categoryOptions: string[];
  seriesOptions: string[];
  onSubmit: (item: InventoryFormValues, productId?: string) => Promise<void>;
}
