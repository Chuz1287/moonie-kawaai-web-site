import type { Product } from "@/types/store";
import { createClient } from "@supabase/supabase-js";

const fallbackProducts: Product[] = [
  {
    id: "prod-001",
    slug: "matcha-latte",
    name: "Matcha Latte",
    description:
      "Bebida artesanal de matcha con leche cremosa, sabor suave y un perfil equilibrado para cualquier momento del día.",
    shortDescription: "Matcha premium con leche cremosa.",
    price: 18,
    compareAtPrice: 22,
    stock: 24,
    featured: true,
    category: "Beverages",
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    ],
    tags: ["matcha", "milk", "featured"],
  },
  {
    id: "prod-002",
    slug: "berry-cheesecake",
    name: "Berry Cheesecake",
    description:
      "Cheesecake con base crujiente y mezcla de bayas, ideal para un postre intensamente sabroso y visualmente irresistible.",
    shortDescription: "Cheesecake con bayas frescas.",
    price: 22,
    compareAtPrice: 28,
    stock: 12,
    featured: true,
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1559622210-78dbeacecbf0?auto=format&fit=crop&w=900&q=80",
    ],
    tags: ["dessert", "berry"],
  },
  {
    id: "prod-003",
    slug: "cinnamon-bun",
    name: "Cinnamon Bun",
    description:
      "Panecillo esponjoso con canela y crema de vainilla, perfecto para acompañar el café o para regalar un momento dulce.",
    shortDescription: "Panecillo esponjoso con canela.",
    price: 16,
    stock: 18,
    featured: false,
    category: "Bakery",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=900&q=80",
    ],
    tags: ["bakery", "cinnamon"],
  },
  {
    id: "prod-004",
    slug: "iced-mocha",
    name: "Iced Mocha",
    description:
      "Café helado con cacao y leche, un sabor intenso y refrescante para quienes buscan energía y placer a la vez.",
    shortDescription: "Café helado con cacao.",
    price: 20,
    stock: 20,
    featured: true,
    category: "Beverages",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1497636577773-f1231844a667?auto=format&fit=crop&w=900&q=80",
    ],
    tags: ["coffee", "iced"],
  },
  {
    id: "prod-005",
    slug: "strawberry-parfait",
    name: "Strawberry Parfait",
    description:
      "Preparación liviana con fresas, crema y textura crujiente para una experiencia dulce y refrescante.",
    shortDescription: "Parfait de fresa y crema.",
    price: 26,
    compareAtPrice: 32,
    stock: 9,
    featured: true,
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80",
    ],
    tags: ["strawberry", "parfait"],
  },
];

const defaultImage =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function mapSupabaseProduct(row: Record<string, unknown>): Product {
  const name = String(row.personaje ?? row.name ?? "Producto sin nombre");
  const category = String(row.tipo ?? row.category ?? "General");
  const price = Number(row.precio ?? row.price ?? 0);
  const stock = Number(row.stock ?? 0);
  const rawCost = Number(row.costo ?? row.cost ?? 0);
  const slug = toSlug(String(row.slug ?? name));
  const featured = stock > 0;

  return {
    id: String(row.id ?? slug),
    slug,
    name,
    description: `${category} ${row.serie ? `- ${String(row.serie)}` : ""}`.trim(),
    shortDescription: [row.caja ? String(row.caja) : null, row.marca ? String(row.marca) : null]
      .filter(Boolean)
      .join(" • ") || "Artículo disponible",
    price: Number.isFinite(price) ? price : 0,
    compareAtPrice: rawCost > 0 && rawCost > price ? rawCost : undefined,
    stock: Number.isFinite(stock) ? stock : 0,
    featured,
    category,
    image: String(row.image ?? defaultImage),
    gallery: [String(row.image ?? defaultImage), defaultImage],
    tags: [row.serie, row.tipo, row.marca].filter(Boolean).map(String),
  };
}

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return fallbackProducts;
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await client.from("products").select("*");

    if (error || !data) {
      return fallbackProducts;
    }

    return data.map((row) => mapSupabaseProduct(row as Record<string, unknown>));
  } catch {
    return fallbackProducts;
  }
}

export function getProducts(): Product[] {
  return fallbackProducts;
}

export function getFeaturedProducts(): Product[] {
  return fallbackProducts.filter((product) => product.featured);
}

export function getProductBySlug(slug: string): Product | undefined {
  return fallbackProducts.find((product) => product.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return fallbackProducts.find((product) => product.id === id);
}

export function getCategories(): string[] {
  return [...new Set(fallbackProducts.map((product) => product.category))];
}

export function updateStock(productId: string, quantity: number): Product | undefined {
  const product = getProductById(productId);

  if (!product) {
    return undefined;
  }

  product.stock = Math.max(0, quantity);
  return product;
}
