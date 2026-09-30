import { NextResponse } from "next/server";
import { fetchSalesFromSupabase } from "@/services/sales";

export async function GET() {
  const sales = await fetchSalesFromSupabase();

  console.log("[api/sales] response size:", sales.length);
  console.log("[api/sales] response sample:", sales.slice(0, 2));

  return NextResponse.json({
    sales,
    total: sales.length,
  });
}
