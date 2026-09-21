import { NextResponse } from "next/server";
import { calculateCartSummary } from "@/services/cart";
import type { CartItem } from "@/types/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { cart?: CartItem[] };
  const cart = body.cart ?? [];

  return NextResponse.json({
    summary: calculateCartSummary(cart),
    cart,
  });
}
