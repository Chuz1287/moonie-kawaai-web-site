export type Product = {
  id: string;
  code?: string;
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
  categories?: string[];
  series?: string;
  height?: string;
  boxIncluded?: boolean;
  boxLabel?: string;
  image: string;
  coverImage?: string;
  gallery: string[];
  tags: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
};
