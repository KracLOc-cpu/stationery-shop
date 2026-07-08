import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "./supabase";
import { seedProducts } from "./seed";
import type {
  Order,
  OrderInput,
  OrderItem,
  OrderStatus,
  Product,
  ProductInput,
  StoreState,
} from "./types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "store.json");
let memoryStore: StoreState | null = null;

type ProductRow = {
  id: string;
  name_ru: string;
  name_kk: string;
  description_ru: string;
  description_kk: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  customer: Order["customer"];
  fulfillment: Order["fulfillment"];
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

const now = () => new Date().toISOString();

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  nameRu: row.name_ru,
  nameKk: row.name_kk,
  descriptionRu: row.description_ru,
  descriptionKk: row.description_kk,
  category: row.category,
  price: row.price,
  stock: row.stock,
  imageUrl: row.image_url,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toProductRow = (product: Product): ProductRow => ({
  id: product.id,
  name_ru: product.nameRu,
  name_kk: product.nameKk,
  description_ru: product.descriptionRu,
  description_kk: product.descriptionKk,
  category: product.category,
  price: product.price,
  stock: product.stock,
  image_url: product.imageUrl,
  active: product.active,
  created_at: product.createdAt,
  updated_at: product.updatedAt,
});

const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  customer: row.customer,
  fulfillment: row.fulfillment,
  items: row.items,
  total: row.total,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toOrderRow = (order: Order): OrderRow => ({
  id: order.id,
  customer: order.customer,
  fulfillment: order.fulfillment,
  items: order.items,
  total: order.total,
  status: order.status,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
});

async function readLocalStore(): Promise<StoreState> {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    const raw = await readFile(storePath, "utf8");
    memoryStore = JSON.parse(raw) as StoreState;
    return memoryStore;
  } catch {
    const initial: StoreState = { products: seedProducts, orders: [] };
    await writeLocalStore(initial);
    return initial;
  }
}

async function writeLocalStore(state: StoreState) {
  memoryStore = state;

  try {
    await mkdir(dataDir, { recursive: true });
    await writeFile(storePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Serverless hosts often expose a read-only project filesystem.
  }
}

export async function listProducts(activeOnly = false): Promise<Product[]> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    let query = supabase.from("products").select("*").order("created_at", {
      ascending: false,
    });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as ProductRow[]).map(toProduct);
  }

  const state = await readLocalStore();
  return state.products
    .filter((product) => (activeOnly ? product.active : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrders(): Promise<Order[]> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as OrderRow[]).map(toOrder);
  }

  const state = await readLocalStore();
  return state.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const stamp = now();
  const product: Product = {
    id: input.id || crypto.randomUUID(),
    nameRu: input.nameRu.trim(),
    nameKk: input.nameKk.trim() || input.nameRu.trim(),
    descriptionRu: input.descriptionRu.trim(),
    descriptionKk: input.descriptionKk.trim() || input.descriptionRu.trim(),
    category: input.category.trim() || "Разное",
    price: Number(input.price),
    stock: Number(input.stock),
    imageUrl: input.imageUrl.trim(),
    active: Boolean(input.active),
    createdAt: stamp,
    updatedAt: stamp,
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const existing = input.id
      ? await supabase.from("products").select("created_at").eq("id", input.id).single()
      : null;
    const row = toProductRow({
      ...product,
      createdAt: existing?.data?.created_at || stamp,
    });
    const { data, error } = await supabase
      .from("products")
      .upsert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toProduct(data as ProductRow);
  }

  const state = await readLocalStore();
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index >= 0) {
    product.createdAt = state.products[index].createdAt;
    state.products[index] = product;
  } else {
    state.products.unshift(product);
  }
  await writeLocalStore(state);
  return product;
}

export async function importProducts(inputs: ProductInput[]) {
  const products = [];
  for (const input of inputs) {
    products.push(await saveProduct(input));
  }
  return products;
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const products = await listProducts(false);
  const items: OrderItem[] = input.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || !product.active) {
      throw new Error("Товар недоступен");
    }
    if (item.quantity < 1 || item.quantity > product.stock) {
      throw new Error(`Недостаточный остаток: ${product.nameRu}`);
    }
    return {
      productId: product.id,
      nameRu: product.nameRu,
      nameKk: product.nameKk,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const stamp = now();
  const order: Order = {
    id: `KZ-${Date.now().toString().slice(-6)}`,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
    },
    fulfillment: input.fulfillment,
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: "new",
    createdAt: stamp,
    updatedAt: stamp,
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .insert(toOrderRow(order))
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (product) {
        await supabase
          .from("products")
          .update({
            stock: Math.max(0, product.stock - item.quantity),
            updated_at: stamp,
          })
          .eq("id", product.id);
      }
    }
    return toOrder(data as OrderRow);
  }

  const state = await readLocalStore();
  for (const item of items) {
    const product = state.products.find((candidate) => candidate.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      product.updatedAt = stamp;
    }
  }
  state.orders.unshift(order);
  await writeLocalStore(state);
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = getSupabaseAdmin();
  const stamp = now();

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: stamp })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toOrder(data as OrderRow);
  }

  const state = await readLocalStore();
  const order = state.orders.find((item) => item.id === id);
  if (!order) throw new Error("Заказ не найден");
  order.status = status;
  order.updatedAt = stamp;
  await writeLocalStore(state);
  return order;
}

export function assertAdminPassword(value: string | null) {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (value !== expected) {
    throw new Error("Неверный пароль администратора");
  }
}
