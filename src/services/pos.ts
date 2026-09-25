import type { CartItem, Product } from "@/types/store";

export type PosCartLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

export type PosSaleRecord = {
  id: string;
  eventId: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export function addProductToCart(
  cart: CartItem[],
  productId: string,
  quantity = 1,
  unitPrice?: number
): CartItem[] {
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    return cart.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity: item.quantity + quantity,
            ...(unitPrice !== undefined ? { unitPrice } : {}),
          }
        : item
    );
  }

  return [...cart, { productId, quantity, ...(unitPrice !== undefined ? { unitPrice } : {}) }];
}

export function removeProductFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  const nextQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;

  if (nextQuantity <= 0) {
    return removeProductFromCart(cart, productId);
  }

  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity: nextQuantity } : item
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
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export function createLocalSaleRecord(cart: CartItem[], products: Product[], eventId = "default"): PosSaleRecord {
  const lines = buildCartLines(cart, products);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  return {
    id: `sale-${Date.now()}`,
    eventId,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    tax,
    total,
    createdAt: new Date().toISOString(),
    products: lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
  };
}

export function getPosStorageKey(): string {
  return "moonie_kawaai_pos_local_sales";
}

export function saveLocalSale(sale: PosSaleRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  const current = JSON.parse(localStorage.getItem(getPosStorageKey()) ?? "[]") as PosSaleRecord[];
  localStorage.setItem(getPosStorageKey(), JSON.stringify([...current, sale]));
}

export function readLocalSales(): PosSaleRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  return JSON.parse(localStorage.getItem(getPosStorageKey()) ?? "[]") as PosSaleRecord[];
}
