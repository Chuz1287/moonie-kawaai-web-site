import type { Product } from "@/types/store";

export type AddToCartButtonProps = {
  product: Product;
  quantity: number;
  onClick?: () => void;
  disabled?: boolean;
};
