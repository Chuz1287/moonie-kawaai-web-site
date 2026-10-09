import type { CartItem, Product } from "@/types/store";

export type PosCartLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

export function addProductToCart(
  cart: CartItem[],
  productId: string,
  quantity = 1,
  unitPrice?: number,
  stockLimit?: number
): CartItem[] {
  const normalizedQuantity = Math.max(0, Number(quantity) || 0);
  const maxAllowed = Number.isFinite(stockLimit) ? Math.max(0, Number(stockLimit ?? 0)) : Number.POSITIVE_INFINITY;
  const existing = cart.find((item) => item.productId === productId);

  if (normalizedQuantity <= 0) {
    return cart;
  }

  if (existing) {
    const nextQuantity = Math.min(existing.quantity + normalizedQuantity, maxAllowed);

    if (nextQuantity <= 0) {
      return cart;
    }

    return cart.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity: nextQuantity,
            ...(unitPrice !== undefined ? { unitPrice } : {}),
          }
        : item
    );
  }

  const nextQuantity = Math.min(normalizedQuantity, maxAllowed);

  if (nextQuantity <= 0) {
    return cart;
  }

  return [...cart, { productId, quantity: nextQuantity, ...(unitPrice !== undefined ? { unitPrice } : {}) }];
}

export function removeProductFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number,
  stockLimit?: number
): CartItem[] {
  const nextQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
  const maxAllowed = Number.isFinite(stockLimit) ? Math.max(0, Number(stockLimit ?? 0)) : Number.POSITIVE_INFINITY;

  if (nextQuantity <= 0) {
    return removeProductFromCart(cart, productId);
  }

  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity: Math.min(nextQuantity, maxAllowed) } : item
  );
}

export function updateCartItemPrice(
  cart: CartItem[],
  productId: string,
  unitPrice: number
): CartItem[] {
  return cart.map((item) =>
    item.productId === productId ? { ...item, unitPrice: Math.max(0, unitPrice) } : item
  );
}

export function buildCartLines(cart: CartItem[], products: Product[]): PosCartLine[] {
  return cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);

      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? product.price,
      };
    })
    .filter((entry): entry is PosCartLine => entry !== null);
}

export function calculateCartTotals(cart: CartItem[], products: Product[]) {
  const lines = buildCartLines(cart, products);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const tax = 0;
  const total = subtotal;

  return {
    subtotal,
    tax,
    total,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
