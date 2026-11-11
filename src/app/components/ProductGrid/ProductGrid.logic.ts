import type { Product } from "@/types/store";

export type ProductGridProps = {
  products: Product[];
  onAdd: (product: Product) => void;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
