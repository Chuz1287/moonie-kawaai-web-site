import { getProductById } from "@/services/catalog";
import type { CartItem, CartSummary } from "@/types/store";

export function calculateCartSummary(cart: CartItem[]): CartSummary {
  const subtotal = cart.reduce((sum, item) => {
    const product = getProductById(item.productId);

    if (!product) {
      return sum;
    }

    return sum + product.price * item.quantity;
  }, 0);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = subtotal > 0 ? 7 : 0;

  return {
    itemCount,
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}

export function addProductToCart(cart: CartItem[], productId: string, quantity = 1): CartItem[] {
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    return cart.map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  }

  return [...cart, { productId, quantity }];
}

export function removeProductFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function updateCartQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return removeProductFromCart(cart, productId);
  }

  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity } : item
  );
}
