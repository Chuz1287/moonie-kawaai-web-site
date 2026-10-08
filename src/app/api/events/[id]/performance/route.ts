import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SaleItem = {
  quantity?: number;
  costo_unitario?: number;
  unitCost?: number;
  cost?: number;
};

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] =
      await Promise.all([
        client.from("sales").select("*").eq("event_id", id),
        client.from("event_expenses").select("amount").eq("event_id", id),
      ]);

    if (salesError) {
      throw new Error(`No se pudieron cargar las ventas del evento: ${salesError.message}`);
    }
    if (expensesError) {
      throw new Error(`No se pudieron cargar los gastos del evento: ${expensesError.message}`);
    }

    let merchandiseCost = 0;
    let incompleteSaleCount = 0;
    const salesTotal = (sales ?? []).reduce((sum, sale) => sum + (finiteNumber(sale.total) ?? 0), 0);

    for (const sale of sales ?? []) {
      const items = Array.isArray(sale.items) ? (sale.items as SaleItem[]) : [];

      if (items.length > 0) {
        let hasUncostedItem = false;

        for (const item of items) {
          const quantity = finiteNumber(item.quantity);
          const unitCost = finiteNumber(item.costo_unitario ?? item.unitCost ?? item.cost);

          if (quantity === null || unitCost === null) {
            hasUncostedItem = true;
            continue;
          }

          merchandiseCost += quantity * unitCost;
        }

        if (hasUncostedItem) {
          incompleteSaleCount += 1;
        }
        continue;
      }

      const legacyQuantity = finiteNumber(sale.cantidad);
      const legacyUnitCost = finiteNumber(sale.costo_unitario);
      const legacyTotal = finiteNumber(sale.total);
      const legacyProfit = finiteNumber(sale.ganancia);

      if (legacyTotal !== null && legacyProfit !== null) {
        merchandiseCost += legacyTotal - legacyProfit;
      } else if (legacyQuantity !== null && legacyUnitCost !== null) {
        merchandiseCost += legacyQuantity * legacyUnitCost;
        incompleteSaleCount += 1;
      } else {
        incompleteSaleCount += 1;
      }
    }

    const expensesTotal = (expenses ?? []).reduce(
      (sum, expense) => sum + (finiteNumber(expense.amount) ?? 0),
      0
    );
    const totalInvestment = expensesTotal + merchandiseCost;

    return NextResponse.json({
      salesTotal,
      expensesTotal,
      merchandiseCost,
      totalInvestment,
      balance: salesTotal - totalInvestment,
      amountToBreakEven: Math.max(0, totalInvestment - salesTotal),
      incompleteSaleCount,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo calcular el retorno del evento." },
      { status: 500 }
    );
  }
}
