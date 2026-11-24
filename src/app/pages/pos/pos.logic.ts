"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addProductToCart,
  calculateCartTotals,
  removeProductFromCart,
  updateCartItemNote,
  updateCartItemPrice,
  updateCartItemQuantity,
} from "@/services/pos";
import type { CartItem, Product } from "@/types/store";
import type { EventPerformance } from "@/types/events";
import { useToast } from "@/components/Toast";

// Catalog utilities
function normalizeCatalogSearchText(value: string): string {
  return value
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterCatalogProducts(products: Product[], search: string): Product[] {
  const availableProducts = products.filter((product) => product.stock > 0);

  if (!search.trim()) {
    return availableProducts.slice(0, 6);
  }

  const term = normalizeCatalogSearchText(search.trim());
  return availableProducts.filter((product) => {
    return [product.name, product.series, product.code].some((field) =>
      normalizeCatalogSearchText(field ?? "").includes(term)
    );
  });
}

export function summarizeInventory(products: Product[]) {
  const totalInventoryCost = products.reduce(
    (sum, product) => sum + (product.cost ?? product.price * 0.7) * product.stock,
    0
  );
  const totalSaleValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0
  );
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
}

export type EventOption = {
  id: string;
  name: string;
  location?: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export function formatPosCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function usePosDashboard() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Listo para vender");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [salesChannels, setSalesChannels] = useState<EventOption[]>([]);
  const [eventPerformance, setEventPerformance] = useState<EventPerformance | null>(null);
  const [eventPerformanceError, setEventPerformanceError] = useState("");
  const [eventPerformanceRefresh, setEventPerformanceRefresh] = useState(0);
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as {
          products?: Product[];
          message?: string;
        };
        if (!response.ok || !Array.isArray(payload.products)) {
          throw new Error(payload.message ?? "No se pudo cargar el inventario.");
        }

        if (!cancelled) {
          setProductCatalog(payload.products);
          setStatus("CatÃ¡logo cargado desde Supabase");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catÃ¡logo desde Supabase"
          );
        }
      }
    }

    async function loadEvents() {
      try {
        const response = await fetch("/api/events?active=true");
        const payload = (await response.json()) as { events?: EventOption[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los eventos.");
        }

        if (!cancelled) {
          const events = Array.isArray(payload.events) ? payload.events : [];
          setSalesChannels(events);

          const savedEvent = localStorage.getItem("moonie_kawaai_selected_event");
          if (savedEvent && events.some((event) => event.id === savedEvent)) {
            setSelectedEvent(savedEvent);
          } else if (events.length > 0) {
            setSelectedEvent(events[0].id);
            localStorage.setItem("moonie_kawaai_selected_event", events[0].id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los eventos de Supabase"
          );
        }
      }
    }

    void loadProducts().finally(() => {
      if (!cancelled) setIsLoadingProducts(false);
    });
    void loadEvents().finally(() => {
      if (!cancelled) setIsLoadingEvents(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshProductImages = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const payload = (await response.json()) as {
          products?: Product[];
          message?: string;
        };
        if (!response.ok || !Array.isArray(payload.products)) {
          throw new Error(payload.message ?? "No se pudo actualizar el catálogo.");
        }
        if (!cancelled) setProductCatalog(payload.products);
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No se pudo actualizar el catálogo."
          );
        }
      }
    };

    window.addEventListener("cloudinary-assets-updated", refreshProductImages);
    return () => {
      cancelled = true;
      window.removeEventListener("cloudinary-assets-updated", refreshProductImages);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEventPerformance() {
      setEventPerformance(null);
      setEventPerformanceError("");

      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(selectedEvent || "default")}/performance`
        );
        const payload = (await response.json()) as EventPerformance & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudo cargar el retorno del evento.");
        }

        if (!cancelled) {
          setEventPerformance(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setEventPerformanceError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el retorno del evento."
          );
        }
      }
    }

    void loadEventPerformance();
    return () => {
      cancelled = true;
    };
  }, [selectedEvent, eventPerformanceRefresh]);

  const filteredProducts = useMemo(
    () => filterCatalogProducts(productCatalog, search),
    [productCatalog, search]
  );
  const inventorySummary = useMemo(
    () => summarizeInventory(productCatalog),
    [productCatalog]
  );
  const totals = useMemo(
    () => calculateCartTotals(cart, productCatalog),
    [cart, productCatalog]
  );
  const hasCartItems = cart.length > 0;
  const { showToast } = useToast();
  const handleAddToCart = (product: { id: string; name: string; stock?: number }) => {
    const stockLimit = Math.max(0, Number(product.stock ?? 0));

    setCart((current) =>
      addProductToCart(current, product.id, 1, undefined, stockLimit)
    );

    if (stockLimit <= 0) {
      setStatus(`${product.name} no tiene stock disponible`);
      return;
    }

    setStatus(`${product.name} agregado al carrito`);
  };

  const handleChangeQuantity = (productId: string, quantity: number) => {
    const product = productCatalog.find((entry) => entry.id === productId);
    const stockLimit = product
      ? Math.max(0, Number(product.stock ?? 0))
      : Number.POSITIVE_INFINITY;

    setCart((current) =>
      updateCartItemQuantity(current, productId, quantity, stockLimit)
    );
  };

  const handleChangePrice = (productId: string, unitPrice: number) => {
    setCart((current) => updateCartItemPrice(current, productId, unitPrice));
  };

  const handleChangeNote = (productId: string, note: string) => {
    setCart((current) => updateCartItemNote(current, productId, note));
  };

  const handleRemove = (productId: string) => {
    setCart((current) => removeProductFromCart(current, productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setStatus("El carrito estÃ¡ vacÃ­o");
      return;
    }
    if (checkoutInFlight.current) return;

    checkoutInFlight.current = true;
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent || "default",
          cart,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        sale?: unknown;
        products?: Product[];
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "No se pudo registrar la venta");
      }

      if (Array.isArray(payload.products)) {
        const currentCoverImages = new Map(
          productCatalog.map((product) => [product.id, product.coverImage])
        );
        setProductCatalog(
          payload.products.map((product) => ({
            ...product,
            coverImage:
              currentCoverImages.get(product.id) ?? product.coverImage,
          }))
        );
      }

      setEventPerformanceRefresh((current) => current + 1);
      setStatus(payload.message ?? "Venta registrada y stock actualizado en vivo.");
      showToast("Venta confirmada", "success");
      setCart([]);
      setIsCartOpen(false);
    } catch (error) {
      console.error("Checkout sync failed", error);
      setStatus("No se pudo registrar la venta. El carrito se conservó para reintentar.");
      showToast("No se pudo registrar la venta", "error");
    } finally {
      checkoutInFlight.current = false;
      setIsCheckingOut(false);
    }
  };

  const handleExportProducts = async () => {
    setIsExportingProducts(true);
    try {
      const csv = [
        ["ID", "Nombre", "CategorÃ­a", "Precio", "Stock", "Costo"],
        ...productCatalog.map((p) => [
          p.id,
          p.name,
          p.category,
          p.price.toString(),
          p.stock.toString(),
          (p.cost ?? p.price * 0.7).toString(),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("CatÃ¡logo exportado a CSV.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo exportar el catÃ¡logo.";
      setStatus(message);
    } finally {
      setIsExportingProducts(false);
    }
  };


  return {
    cart,
    setCart,
    search,
    setSearch,
    status,
    setStatus,
    selectedEvent,
    setSelectedEvent,
    salesChannels,
    eventPerformance,
    eventPerformanceError,
    isExportingProducts,
    productCatalog,
    isLoadingProducts,
    isLoadingEvents,
    isCartOpen,
    isCheckingOut,
    setIsCartOpen,
    filteredProducts,
    inventorySummary,
    totals,
    hasCartItems,
    handleAddToCart,
    handleChangeQuantity,
    handleChangePrice,
    handleChangeNote,
    handleRemove,
    handleCheckout,
    handleExportProducts,
  };
}

export type PosDashboardModel = ReturnType<typeof usePosDashboard>;
