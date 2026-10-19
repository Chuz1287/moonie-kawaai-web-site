"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addProductToCart,
  calculateCartTotals,
  removeProductFromCart,
  updateCartItemPrice,
  updateCartItemQuantity,
} from "@/services/pos";
import type { CartItem, Product } from "@/types/store";
import { filterCatalogProducts, summarizeInventory } from "../catalog/catalog.logic";

export type EventOption = {
  id: string;
  name: string;
  location?: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export type EventExpense = {
  id: string;
  event_id: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
};

export type EventPerformance = {
  salesTotal: number;
  expensesTotal: number;
  merchandiseCost: number;
  totalInvestment: number;
  balance: number;
  amountToBreakEven: number;
  incompleteSaleCount: number;
};

const expenseCategories = ["Stand / piso", "Comida", "Sueldos", "Caseta", "Gasolina"];

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
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("default");
  const [salesChannels, setSalesChannels] = useState<EventOption[]>([]);
  const [eventPerformance, setEventPerformance] = useState<EventPerformance | null>(null);
  const [eventPerformanceError, setEventPerformanceError] = useState("");
  const [eventPerformanceRefresh, setEventPerformanceRefresh] = useState(0);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [managedEventId, setManagedEventId] = useState("");
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([]);
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]);
  const [customExpenseCategory, setCustomExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [eventModalStatus, setEventModalStatus] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [editingEventName, setEditingEventName] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [editingExpenseAmount, setEditingExpenseAmount] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState("");
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          setProductCatalog(payload.products ?? []);
          setStatus("Catálogo cargado desde Supabase");
        }
      } catch {
        if (!cancelled) {
          setStatus("No se pudo cargar el catálogo desde Supabase");
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
          }
          setManagedEventId((current) =>
            current ||
            (savedEvent && events.some((event) => event.id === savedEvent)
              ? savedEvent
              : events[0]?.id ?? "")
          );
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

    void loadProducts();
    void loadEvents();

    return () => {
      cancelled = true;
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

  useEffect(() => {
    let cancelled = false;

    async function loadEventExpenses() {
      if (!isEventModalOpen || !managedEventId) {
        setEventExpenses([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(managedEventId)}/expenses`
        );
        const payload = (await response.json()) as {
          expenses?: EventExpense[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudieron cargar los gastos del evento.");
        }

        if (!cancelled) {
          setEventExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
        }
      } catch (error) {
        if (!cancelled) {
          setEventModalStatus(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los gastos del evento."
          );
        }
      }
    }

    void loadEventExpenses();
    return () => {
      cancelled = true;
    };
  }, [isEventModalOpen, managedEventId]);

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
  const totalEventExpenses = useMemo(
    () => eventExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    [eventExpenses]
  );

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

  const handleAddStock = async (product: Product, quantity: number) => {
    const amount = Math.max(1, Number(quantity) || 1);

    try {
      const response = await fetch("/api/products/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          delta: amount,
          operation: "add",
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        product?: Product;
        message?: string;
      };

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "No se pudo actualizar el stock");
      }

      setProductCatalog((current) =>
        current.map((entry) => (entry.id === product.id ? payload.product! : entry))
      );
      setStatus(
        `Stock de ${product.name} actualizado +${amount}. ${
          payload.message ?? "Sincronizado en vivo."
        }`
      );
    } catch (error) {
      console.error("Add stock API failed", error);
      setStatus(`No se pudo actualizar el stock de ${product.name} desde la API.`);
    }
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

  const handleRemove = (productId: string) => {
    setCart((current) => removeProductFromCart(current, productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setStatus("El carrito está vacío");
      return;
    }

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
        setProductCatalog(payload.products);
      }

      setEventPerformanceRefresh((current) => current + 1);
      setStatus(payload.message ?? "Venta registrada y stock actualizado en vivo.");
    } catch (error) {
      console.error("Checkout sync failed", error);
      setStatus("No se pudo registrar la venta en la API en vivo.");
    } finally {
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const handleSaveChannel = async () => {
    const normalized = eventName.trim();

    if (!normalized || !eventStartDate || !eventEndDate || isSavingEvent) {
      return;
    }
    if (eventEndDate < eventStartDate) {
      const message = "La fecha de fin debe ser igual o posterior a la fecha de inicio.";
      setEventModalStatus(message);
      setStatus(message);
      return;
    }

    setIsSavingEvent(true);
    setEventModalStatus("");
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalized,
          location: eventLocation.trim(),
          start_date: eventStartDate,
          end_date: eventEndDate,
        }),
      });
      const payload = (await response.json()) as {
        event?: EventOption;
        message?: string;
      };

      if (!response.ok || !payload.event) {
        throw new Error(payload.message ?? "No se pudo guardar el evento.");
      }

      setSalesChannels((current) => [
        ...current.filter((event) => event.id !== payload.event!.id),
        payload.event!,
      ]);
      setSelectedEvent(payload.event.id);
      localStorage.setItem("moonie_kawaai_selected_event", payload.event.id);
      setStatus(`Evento activo: ${payload.event.name}`);
      setEventModalStatus(
        `Evento creado y activado: ${payload.event.name}. Ahora puedes registrar sus gastos.`
      );
      setManagedEventId(payload.event.id);
      setEventExpenses([]);
      setEventName("");
      setEventLocation("");
      setEventStartDate("");
      setEventEndDate("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el evento.";
      setStatus(message);
      setEventModalStatus(message);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleRenameEvent = async (event: EventOption) => {
    const name = editingEventName.trim();
    if (!name || name === event.name || editingEventId !== event.id) {
      return;
    }

    setEditingEventId("");
    setEventModalStatus("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(event.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as { event?: EventOption; message?: string };

      if (!response.ok || !payload.event) {
        throw new Error(payload.message ?? "No se pudo actualizar el nombre del evento.");
      }

      setSalesChannels((current) =>
        current.map((item) => item.id === payload.event!.id ? payload.event! : item)
      );
      setEventModalStatus(`Nombre de evento actualizado a "${payload.event.name}".`);
      setStatus(`Nombre de evento actualizado a "${payload.event.name}".`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "No se pudo actualizar el nombre del evento.";
      setEditingEventId(event.id);
      setEventModalStatus(message);
    }
  };

  const handleExportProducts = async () => {
    if (isExportingProducts) {
      return;
    }

    setIsExportingProducts(true);
    try {
      const response = await fetch("/api/products/export");

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "No se pudo descargar el catálogo.");
      }

      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `catalogo-productos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Catálogo de Supabase descargado en Excel.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "No se pudo descargar el catálogo."
      );
    } finally {
      setIsExportingProducts(false);
    }
  };

  const handleSaveEventExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const category =
      expenseCategory === "__custom__" ? customExpenseCategory.trim() : expenseCategory;

    if (!managedEventId || !category || isSavingExpense) {
      return;
    }

    setIsSavingExpense(true);
    setEventModalStatus("");
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(managedEventId)}/expenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            amount: Number(expenseAmount),
          }),
        }
      );
      const payload = (await response.json()) as {
        expense?: EventExpense;
        message?: string;
      };

      if (!response.ok || !payload.expense) {
        throw new Error(payload.message ?? "No se pudo guardar el gasto.");
      }

      setEventExpenses((current) => [payload.expense!, ...current]);
      if (managedEventId === selectedEvent) {
        setEventPerformanceRefresh((current) => current + 1);
      }
      setExpenseCategory(expenseCategories[0]);
      setCustomExpenseCategory("");
      setExpenseAmount("");
      setEventModalStatus("Gasto registrado en el evento.");
    } catch (error) {
      setEventModalStatus(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleUpdateEventExpense = async (expense: EventExpense) => {
    const amount = Number(editingExpenseAmount);
    if (!managedEventId || !Number.isFinite(amount) || amount <= 0 || isUpdatingExpense) {
      setEventModalStatus("Ingresa un importe mayor que cero.");
      return;
    }

    setIsUpdatingExpense(true);
    setEventModalStatus("");
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(managedEventId)}/expenses`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenseId: expense.id, amount }),
        }
      );
      const payload = (await response.json()) as {
        expense?: EventExpense;
        message?: string;
      };

      if (!response.ok || !payload.expense) {
        throw new Error(payload.message ?? "No se pudo actualizar el gasto.");
      }

      setEventExpenses((current) =>
        current.map((item) => item.id === payload.expense!.id ? payload.expense! : item)
      );
      setEditingExpenseId("");
      setEditingExpenseAmount("");
      setEventModalStatus("Importe del gasto actualizado.");
      if (managedEventId === selectedEvent) {
        setEventPerformanceRefresh((current) => current + 1);
      }
    } catch (error) {
      setEventModalStatus(
        error instanceof Error ? error.message : "No se pudo actualizar el gasto."
      );
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleDeleteEvent = async (event: EventOption) => {
    if (
      deletingEventId ||
      !window.confirm(
        `¿Borrar el evento "${event.name}" y sus gastos? Las ventas históricas no se borrarán.`
      )
    ) {
      return;
    }

    setDeletingEventId(event.id);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo borrar el evento.");
      }

      setSalesChannels((current) => current.filter((item) => item.id !== event.id));
      const remainingEvents = salesChannels.filter((item) => item.id !== event.id);
      if (selectedEvent === event.id) {
        setSelectedEvent("default");
        localStorage.setItem("moonie_kawaai_selected_event", "default");
      }
      if (managedEventId === event.id) {
        setManagedEventId(remainingEvents[0]?.id ?? "");
        setEventExpenses([]);
      }
      const message = `Evento eliminado: ${event.name}`;
      setStatus(message);
      setEventModalStatus(message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo borrar el evento.";
      setStatus(message);
      setEventModalStatus(message);
    } finally {
      setDeletingEventId("");
    }
  };

  return {
    cart,
    search,
    setSearch,
    status,
    eventName,
    setEventName,
    eventLocation,
    setEventLocation,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    selectedEvent,
    setSelectedEvent,
    salesChannels,
    eventPerformance,
    eventPerformanceError,
    isEventModalOpen,
    setIsEventModalOpen,
    managedEventId,
    setManagedEventId,
    eventExpenses,
    expenseCategory,
    setExpenseCategory,
    customExpenseCategory,
    setCustomExpenseCategory,
    expenseAmount,
    setExpenseAmount,
    eventModalStatus,
    editingEventId,
    setEditingEventId,
    editingEventName,
    setEditingEventName,
    editingExpenseId,
    setEditingExpenseId,
    editingExpenseAmount,
    setEditingExpenseAmount,
    isSavingEvent,
    isSavingExpense,
    isUpdatingExpense,
    isExportingProducts,
    deletingEventId,
    productCatalog,
    isCartOpen,
    setIsCartOpen,
    filteredProducts,
    inventorySummary,
    totals,
    hasCartItems,
    totalEventExpenses,
    handleAddToCart,
    handleAddStock,
    handleChangeQuantity,
    handleChangePrice,
    handleRemove,
    handleCheckout,
    handleSaveChannel,
    handleRenameEvent,
    handleExportProducts,
    handleSaveEventExpense,
    handleUpdateEventExpense,
    handleDeleteEvent,
  };
}

export type PosDashboardModel = ReturnType<typeof usePosDashboard>;
