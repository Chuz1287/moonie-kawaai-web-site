import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  EventDailySales,
  EventFigurePriceRanking,
  EventPerformance,
  EventSalesRanking,
} from "@/types/events";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const pageSize = 1000;

type SaleItem = {
  productId?: unknown;
  productName?: unknown;
  character?: unknown;
  series?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  costo_unitario?: unknown;
  unitCost?: unknown;
  cost?: unknown;
};

type SaleRecord = Record<string, unknown> & {
  items?: unknown;
};

type ProductIdentity = {
  character: string;
  series: string;
};

type MutableRanking = {
  name: string;
  unitsSold: number;
  salesTotal: number;
  grossProfit: number | null;
};

type MutableFigurePriceRanking = EventFigurePriceRanking;

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSaleDate(sale: SaleRecord): string {
  const createdAt = stringValue(sale.created_at);
  const date = createdAt || stringValue(sale.fecha);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Sin fecha" : parsed.toISOString().slice(0, 10);
}

async function fetchAllSales(
  client: SupabaseClient,
  eventId: string
): Promise<SaleRecord[]> {
  const sales: SaleRecord[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("sales")
      .select("id, total, ganancia, cantidad, costo_unitario, fecha, created_at, personaje, serie, items")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`No se pudieron cargar las ventas del evento: ${error.message}`);
    }

    const page = (data ?? []) as SaleRecord[];
    sales.push(...page);
    if (page.length < pageSize) {
      return sales;
    }
  }
}

async function fetchAllExpenses(
  client: SupabaseClient,
  eventId: string
): Promise<Array<{ amount: unknown }>> {
  const expenses: Array<{ amount: unknown }> = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("event_expenses")
      .select("amount")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`No se pudieron cargar los gastos del evento: ${error.message}`);
    }

    const page = (data ?? []) as Array<{ amount: unknown }>;
    expenses.push(...page);
    if (page.length < pageSize) {
      return expenses;
    }
  }
}

async function fetchProductIdentities(
  client: SupabaseClient,
  sales: SaleRecord[]
): Promise<Map<string, ProductIdentity>> {
  const productIds = [...new Set(
    sales.flatMap((sale) =>
      (Array.isArray(sale.items) ? sale.items : [])
        .filter((item): item is SaleItem => typeof item === "object" && item !== null)
        .map((item) => String(item.productId ?? ""))
        .filter((id) => /^[1-9]\d*$/.test(id))
    )
  )];
  const identities = new Map<string, ProductIdentity>();

  for (let offset = 0; offset < productIds.length; offset += 200) {
    const batch = productIds.slice(offset, offset + 200);
    const { data, error } = await client
      .from("products")
      .select("id, personaje, serie")
      .in("id", batch.map(Number));

    if (error) {
      throw new Error(`No se pudieron cargar las series y personajes: ${error.message}`);
    }

    const products = (data ?? []) as Array<{
      id: string | number;
      personaje?: string | null;
      serie?: string | null;
    }>;
    for (const product of products) {
      identities.set(String(product.id), {
        character: stringValue(product.personaje),
        series: stringValue(product.serie),
      });
    }
  }

  return identities;
}

function addRanking(
  rankings: Map<string, MutableRanking>,
  name: string,
  quantity: number,
  revenue: number,
  grossProfit: number | null
) {
  const current = rankings.get(name) ?? {
    name,
    unitsSold: 0,
    salesTotal: 0,
    grossProfit: 0,
  };
  current.unitsSold += quantity;
  current.salesTotal += revenue;
  if (current.grossProfit !== null) {
    current.grossProfit = grossProfit === null
      ? null
      : current.grossProfit + grossProfit;
  }
  rankings.set(name, current);
}

function sortedRankings(rankings: Map<string, MutableRanking>): EventSalesRanking[] {
  return [...rankings.values()]
    .sort((first, second) =>
      second.unitsSold - first.unitsSold ||
      second.salesTotal - first.salesTotal ||
      first.name.localeCompare(second.name, "es-MX")
    );
}

function addFigurePrice(
  rankings: Map<string, MutableFigurePriceRanking>,
  id: string,
  name: string,
  unitPrice: number,
  quantity: number,
  revenue: number
) {
  const current = rankings.get(id) ?? {
    id,
    name,
    highestUnitPrice: unitPrice,
    unitsSold: 0,
    salesTotal: 0,
  };
  current.highestUnitPrice = Math.max(current.highestUnitPrice, unitPrice);
  current.unitsSold += quantity;
  current.salesTotal += revenue;
  rankings.set(id, current);
}

function sortedFigurePrices(
  rankings: Map<string, MutableFigurePriceRanking>
): EventFigurePriceRanking[] {
  return [...rankings.values()].sort((first, second) =>
    second.highestUnitPrice - first.highestUnitPrice ||
    second.salesTotal - first.salesTotal ||
    first.name.localeCompare(second.name, "es-MX")
  );
}

function emptyPerformance(): EventPerformance {
  return {
    salesTotal: 0,
    expensesTotal: 0,
    merchandiseCost: 0,
    totalInvestment: 0,
    grossProfit: 0,
    netProfit: 0,
    netMarginPercent: null,
    roiPercent: null,
    balance: 0,
    amountToBreakEven: 0,
    incompleteSaleCount: 0,
    salesCount: 0,
    unitsSold: 0,
    averageTicket: 0,
    topSeries: [],
    topCharacters: [],
    topFiguresByPrice: [],
    dailySales: [],
  };
}

function buildPerformance(
  sales: SaleRecord[],
  expenses: Array<{ amount: unknown }>,
  productIdentities: Map<string, ProductIdentity>
): EventPerformance {
  let salesTotal = 0;
  let merchandiseCost = 0;
  let incompleteSaleCount = 0;
  let unitsSold = 0;
  const seriesRankings = new Map<string, MutableRanking>();
  const characterRankings = new Map<string, MutableRanking>();
  const figurePriceRankings = new Map<string, MutableFigurePriceRanking>();
  const dailySalesMap = new Map<string, EventDailySales>();

  for (const sale of sales) {
    const saleItems = Array.isArray(sale.items)
      ? sale.items.filter((item): item is SaleItem => typeof item === "object" && item !== null)
      : [];
    const itemsRevenue = saleItems.reduce((sum, item) => {
      const quantity = finiteNumber(item.quantity);
      const unitPrice = finiteNumber(item.unitPrice);
      return quantity !== null && unitPrice !== null
        ? sum + quantity * unitPrice
        : sum;
    }, 0);
    const saleRevenue = finiteNumber(sale.total) ?? itemsRevenue;
    salesTotal += saleRevenue;

    const saleDate = getSaleDate(sale);
    const daily = dailySalesMap.get(saleDate) ?? {
      date: saleDate,
      salesCount: 0,
      salesTotal: 0,
    };
    daily.salesCount += 1;
    daily.salesTotal += saleRevenue;
    dailySalesMap.set(saleDate, daily);

    if (saleItems.length > 0) {
      let saleHasIncompleteData = false;

      for (const item of saleItems) {
        const quantity = finiteNumber(item.quantity);
        const unitPrice = finiteNumber(item.unitPrice);
        const unitCost = finiteNumber(item.costo_unitario ?? item.unitCost ?? item.cost);
        if (quantity === null || quantity <= 0) {
          saleHasIncompleteData = true;
          continue;
        }

        unitsSold += quantity;
        const lineRevenue = unitPrice === null ? 0 : quantity * unitPrice;
        if (unitPrice === null) {
          saleHasIncompleteData = true;
        }

        const lineGrossProfit = unitCost === null || unitPrice === null
          ? null
          : quantity * (unitPrice - unitCost);
        if (unitCost === null) {
          saleHasIncompleteData = true;
        } else {
          merchandiseCost += quantity * unitCost;
        }

        const identity = productIdentities.get(String(item.productId ?? ""));
        const series = stringValue(item.series) ||
          identity?.series ||
          (saleItems.length === 1 ? stringValue(sale.serie) : "") ||
          "Sin dato";
        const character =
          stringValue(item.character) ||
          stringValue(item.productName) ||
          identity?.character ||
          (saleItems.length === 1 ? stringValue(sale.personaje) : "") ||
          "Sin dato";

        addRanking(seriesRankings, series, quantity, lineRevenue, lineGrossProfit);
        addRanking(characterRankings, character, quantity, lineRevenue, lineGrossProfit);
        if (unitPrice !== null && character !== "Sin dato") {
          const id = String(item.productId ?? "").trim() || character;
          addFigurePrice(figurePriceRankings, id, character, unitPrice, quantity, lineRevenue);
        }
      }

      if (saleHasIncompleteData) {
        incompleteSaleCount += 1;
      }
      continue;
    }

    const quantity = finiteNumber(sale.cantidad);
    const legacyCost = finiteNumber(sale.costo_unitario);
    const legacyProfit = finiteNumber(sale.ganancia);
    const character = stringValue(sale.personaje);
    if (quantity !== null && quantity > 0 && character) {
      addFigurePrice(
        figurePriceRankings,
        character,
        character,
        saleRevenue / quantity,
        quantity,
        saleRevenue
      );
    }

    if (legacyProfit !== null && finiteNumber(sale.total) !== null) {
      merchandiseCost += saleRevenue - legacyProfit;
      if (quantity !== null && quantity > 0) {
        unitsSold += quantity;
        addRanking(
          seriesRankings,
          stringValue(sale.serie) || "Sin dato",
          quantity,
          saleRevenue,
          legacyProfit
        );
        addRanking(
          characterRankings,
          stringValue(sale.personaje) || "Sin dato",
          quantity,
          saleRevenue,
          legacyProfit
        );
      } else {
        incompleteSaleCount += 1;
      }
    } else if (quantity !== null && legacyCost !== null && quantity > 0) {
      merchandiseCost += quantity * legacyCost;
      unitsSold += quantity;
      incompleteSaleCount += 1;
      addRanking(
        seriesRankings,
        stringValue(sale.serie) || "Sin dato",
        quantity,
        saleRevenue,
        null
      );
      addRanking(
        characterRankings,
        stringValue(sale.personaje) || "Sin dato",
        quantity,
        saleRevenue,
        null
      );
    } else {
      incompleteSaleCount += 1;
    }
  }

  const expensesTotal = expenses.reduce(
    (sum, expense) => sum + (finiteNumber(expense.amount) ?? 0),
    0
  );
  const totalInvestment = merchandiseCost + expensesTotal;
  const grossProfit = salesTotal - merchandiseCost;
  const netProfit = grossProfit - expensesTotal;
  const salesCount = sales.length;
  const dailySales = [...dailySalesMap.values()].sort((first, second) =>
    first.date.localeCompare(second.date, "es-MX")
  );

  return {
    salesTotal,
    expensesTotal,
    merchandiseCost,
    totalInvestment,
    grossProfit,
    netProfit,
    netMarginPercent:
      salesTotal > 0 && incompleteSaleCount === 0
        ? (netProfit / salesTotal) * 100
        : null,
    roiPercent:
      totalInvestment > 0 && incompleteSaleCount === 0
        ? (netProfit / totalInvestment) * 100
        : null,
    balance: netProfit,
    amountToBreakEven: Math.max(0, totalInvestment - salesTotal),
    incompleteSaleCount,
    salesCount,
    unitsSold,
    averageTicket: salesCount > 0 ? salesTotal / salesCount : 0,
    topSeries: sortedRankings(seriesRankings),
    topCharacters: sortedRankings(characterRankings),
    topFiguresByPrice: sortedFigurePrices(figurePriceRankings),
    dailySales,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: "Supabase no está configurado." }, { status: 500 });
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (id === "default") {
      return NextResponse.json(emptyPerformance(), {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const [sales, expenses] = await Promise.all([
      fetchAllSales(client, id),
      fetchAllExpenses(client, id),
    ]);
    const productIdentities = await fetchProductIdentities(client, sales);

    return NextResponse.json(buildPerformance(sales, expenses, productIdentities), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "No se pudo calcular el rendimiento del evento.";
    console.error("Event performance query failed:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
