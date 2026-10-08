import Dexie, { type Table } from "dexie";

export type Product = {
  id?: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type SaleItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id?: number;
  saleNumber: string;
  items: SaleItem[];
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  status: "pending" | "completed" | "synced";
  createdAt: string;
  syncedAt?: string | null;
};

class AppDatabase extends Dexie {
  products!: Table<Product, number>;
  sales!: Table<Sale, number>;

  constructor() {
    super("moonie-kawaai-db");

    this.version(1).stores({
      products:
        "++id, code, category, name, price, stock, createdAt, updatedAt",
      sales: "++id, saleNumber, status, paymentMethod, createdAt, total",
    });
  }
}

export const db = new AppDatabase();

export async function seedProducts(): Promise<void> {
  const count = await db.products.count();

  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();

  await db.products.bulkPut([
    {
      code: "MKT-001",
      name: "Matcha Latte",
      price: 18,
      stock: 24,
      category: "Beverages",
      createdAt: now,
      updatedAt: now,
    },
    {
      code: "MKT-002",
      name: "Berry Cheesecake",
      price: 22,
      stock: 12,
      category: "Desserts",
      createdAt: now,
      updatedAt: now,
    },
    {
      code: "MKT-003",
      name: "Cinnamon Bun",
      price: 16,
      stock: 18,
      category: "Bakery",
      createdAt: now,
      updatedAt: now,
    },
    {
      code: "MKT-004",
      name: "Iced Mocha",
      price: 20,
      stock: 20,
      category: "Beverages",
      createdAt: now,
      updatedAt: now,
    },
    {
      code: "MKT-005",
      name: "Strawberry Parfait",
      price: 26,
      stock: 9,
      category: "Desserts",
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function persistCatalogStockToDexie(
  catalog: Array<{ id?: string | number; name?: string; code?: string; stock: number }>
): Promise<void> {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  for (const product of catalog) {
    const nextStock = Number(product.stock ?? 0);
    const lookupName = String(product.name ?? "").trim();
    const lookupCode = String(product.code ?? "").trim();

    if (!lookupName && !lookupCode && product.id === undefined) {
      continue;
    }

    let existing: Product | undefined;

    if (lookupCode) {
      existing = await db.products.where("code").equals(lookupCode).first();
    }

    if (!existing && lookupName) {
      existing = await db.products.where("name").equals(lookupName).first();
    }

    if (!existing && product.id !== undefined) {
      const productId = Number(product.id);
      if (Number.isFinite(productId) && productId > 0) {
        existing = await db.products.get(productId);
      }
    }

    if (!existing) {
      continue;
    }

    await db.products.update(existing.id!, {
      stock: Math.max(0, nextStock),
      updatedAt: now,
    });
  }
}
