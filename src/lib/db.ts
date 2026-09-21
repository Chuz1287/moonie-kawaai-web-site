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
