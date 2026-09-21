"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { db, type Product, type Sale, seedProducts } from "@/lib/db";
import { syncProductsToSupabase, syncSalesToSupabase } from "@/lib/supabase";

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
};

export function usePosModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isSyncing, setIsSyncing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const localProducts = await db.products.orderBy("name").toArray();

      if (localProducts.length === 0) {
        await seedProducts();
        const seededProducts = await db.products.orderBy("name").toArray();
        setProducts(seededProducts);
        return;
      }

      setProducts(localProducts);
    } catch (error) {
      console.error("Failed to load products", error);
      setStatus("Error loading inventory");
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products;
    }

    const term = search.toLowerCase();

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const addToCart = useCallback((product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id as number,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((current) =>
        current.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    },
    [removeFromCart]
  );

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const saveSale = useCallback(async () => {
    if (cart.length === 0) {
      setStatus("Cart is empty");
      return;
    }

    const sale: Sale = {
      saleNumber: `SALE-${Date.now()}`,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      total,
      paymentMethod: "card",
      status: "completed",
      createdAt: new Date().toISOString(),
      syncedAt: null,
    };

    try {
      await db.sales.add(sale);
      setCart([]);
      setStatus(`Sale ${sale.saleNumber} saved locally`);
    } catch (error) {
      console.error("Failed to save sale", error);
      setStatus("Error saving sale");
    }
  }, [cart, total]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    setStatus("Syncing to remote...");

    try {
      const localProducts = await db.products.toArray();
      const localSales = await db.sales.toArray();

      const productResult = await syncProductsToSupabase(localProducts);
      const saleResult = await syncSalesToSupabase(localSales);

      setStatus(`${productResult.message} ${saleResult.message}`.trim());
    } catch (error) {
      console.error("Sync failed", error);
      setStatus("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    products: filteredProducts,
    cart,
    search,
    setSearch,
    subtotal,
    tax,
    total,
    status,
    isSyncing,
    addToCart,
    removeFromCart,
    updateQuantity,
    saveSale,
    syncNow,
  };
}
