export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  cost?: number;
  compareAtPrice?: number;
  stock: number;
  featured: boolean;
  category: string;
  image: string;
  gallery: string[];
  tags: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
};
