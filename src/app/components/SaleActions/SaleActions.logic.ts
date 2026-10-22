import type { SaleRecord } from "@/services/sales";

export type SaleActionsProps = {
  sale: SaleRecord;
  disabled?: boolean;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
};
