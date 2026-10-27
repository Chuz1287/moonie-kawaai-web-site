import { useMemo } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/store";
import { fetchProductsFromSupabase } from "@/services/catalog";

export interface InventoryItem extends Product {}

export interface InventorySummary {
  totalInventoryCost: number;
  totalSaleValue: number;
  grossProfit: number;
  grossMarginPercent: number;
  markupPercent: number;
  markupExcessPercent: number;
  markupExcessValue: number;
}

export interface InventoryDashboardModel {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refreshInventory: () => Promise<void>;
  handleAddStock: (productId: string, quantity: number) => Promise<void>;
  handleRemoveItem: (productId: string) => Promise<void>;
  handleAddItem: (item: Omit<InventoryItem, "id" | "slug" | "gallery" | "featured"> & { series?: string }) => Promise<void>;
  filteredItems: InventoryItem[];
  inventorySummary: InventorySummary;
}

export function useInventoryDashboard(): InventoryDashboardModel {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const products = await fetchProductsFromSupabase();
      setItems((products as InventoryItem[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error fetching inventory";
      setError(message);
      console.error("Inventory fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInventory();
  }, []);

  const handleAddStock = async (productId: string, quantity: number) => {
    try {
      if (!supabase) throw new Error("Database not configured");
      
      const item = items.find((i) => i.id === productId);
      if (!item) throw new Error("Product not found");

      const newStock = (item.stock || 0) + quantity;
      if (newStock < 0) throw new Error("Stock cannot be negative");

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId);

      if (updateError) throw new Error(updateError.message);

      setItems((prev) =>
        prev.map((i) => (i.id === productId ? { ...i, stock: newStock } : i))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error adding stock";
      setError(message);
      console.error("Add stock error:", err);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      if (!supabase) throw new Error("Database not configured");
      
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) throw new Error(deleteError.message);

      setItems((prev) => prev.filter((i) => i.id !== productId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error deleting product";
      setError(message);
      console.error("Delete error:", err);
    }
  };

  const handleAddItem = async (item: Omit<InventoryItem, "id" | "slug" | "gallery" | "featured">) => {
    try {
      if (!supabase) throw new Error("Database not configured");
      
      const { data, error: insertError } = await supabase
        .from("products")
        .insert([{
          ...item,
          slug: item.name.toLowerCase().replace(/\s+/g, "-"),
          gallery: [],
          featured: false,
        }])
        .select();

      if (insertError) throw new Error(insertError.message);

      if (data) {
        setItems((prev) => [...prev, ...(data as InventoryItem[])]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error adding product";
      setError(message);
      console.error("Add product error:", err);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.series?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [items, searchQuery]);

  const inventorySummary = useMemo(() => {
    const totalInventoryCost = items.reduce((sum, item) => {
      const cost = item.cost ?? item.price * 0.7;
      return sum + cost * (item.stock || 0);
    }, 0);

    const totalSaleValue = items.reduce((sum, item) => {
      return sum + item.price * (item.stock || 0);
    }, 0);

    const grossProfit = totalSaleValue - totalInventoryCost;
    const grossMarginPercent = totalSaleValue > 0 ? (grossProfit / totalSaleValue) * 100 : 0;
    const markupPercent = totalInventoryCost > 0 ? (grossProfit / totalInventoryCost) * 100 : 0;

    return {
      totalInventoryCost,
      totalSaleValue,
      grossProfit,
      grossMarginPercent,
      markupPercent,
      markupExcessPercent: Math.max(0, markupPercent - 100),
      markupExcessValue: Math.max(0, grossProfit - totalInventoryCost),
    };
  }, [items]);

  return {
    items,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refreshInventory: fetchInventory,
    handleAddStock,
    handleRemoveItem,
    handleAddItem,
    filteredItems,
    inventorySummary,
  };
}
