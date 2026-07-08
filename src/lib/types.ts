export type Locale = "ru" | "kk";

export type FulfillmentType = "pickup" | "delivery";

export type OrderStatus = "new" | "confirmed" | "rejected" | "completed";

export type Product = {
  id: string;
  nameRu: string;
  nameKk: string;
  descriptionRu: string;
  descriptionKk: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type OrderItem = {
  productId: string;
  nameRu: string;
  nameKk: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  fulfillment: {
    type: FulfillmentType;
    address: string;
    comment: string;
  };
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type OrderInput = {
  customer: Order["customer"];
  fulfillment: Order["fulfillment"];
  items: CartItem[];
};

export type StoreState = {
  products: Product[];
  orders: Order[];
};
