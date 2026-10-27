import type { SalesHistoryModel } from "@/pages/sales/sales.logic";
import type { DraftLine } from "@/pages/sales/sales.logic";

export type SaleEditDialogProps = {
  model: SalesHistoryModel;
};

export function isDraftLinesValid(lines: DraftLine[]): boolean {
  return lines.every(
    (line) =>
      line.quantity > 0 &&
      Number.isFinite(line.quantity) &&
      line.unitPrice >= 0 &&
      Number.isFinite(line.unitPrice)
  );
}

export function getDraftLinesTotal(lines: DraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}
