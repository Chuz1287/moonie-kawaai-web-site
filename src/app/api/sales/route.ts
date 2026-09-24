import { NextResponse } from "next/server";
import { fetchSalesFromSupabase } from "@/services/sales";

export async function GET() {
  const sales = await fetchSalesFromSupabase();

  return NextResponse.json({
    sales,
    total: sales.length,
  });
}
