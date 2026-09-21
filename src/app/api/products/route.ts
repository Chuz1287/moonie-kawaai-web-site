import { NextResponse } from "next/server";
import { fetchProductsFromSupabase } from "@/services/catalog";

export async function GET() {
  const products = await fetchProductsFromSupabase();

  return NextResponse.json({
    products,
    total: products.length,
  });
}
