"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readSheet } from "read-excel-file/browser";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  FileSpreadsheet,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { formatMoney } from "@/lib/i18n";
import { formatPhoneForDisplay, getWhatsAppUrl } from "@/lib/phone";
import type { Order, OrderStatus, Product, ProductInput } from "@/lib/types";

const emptyProduct: ProductInput = {
  nameRu: "",
  nameKk: "",
  descriptionRu: "",
  descriptionKk: "",
  category: "",
  price: 0,
  stock: 0,
  imageUrl: "",
  active: true,
};

const statusLabels: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтвержден",
  rejected: "Отклонен",
  completed: "Завершен",
};

const statusStyles: Record<OrderStatus, string> = {
  new: "bg-[#fff7ed] text-[#c2410c]",
  confirmed: "bg-[#e8f3ef] text-[#115e59]",
  rejected: "bg-[#fee2e2] text-[#b42318]",
  completed: "bg-[#eef2ff] text-[#3730a3]",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-KZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export default function AdminPage() {
  const [password, setPassword] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("admin-password") || "",
  );
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productForm, setProductForm] = useState<ProductInput>(emptyProduct);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const headers = useMemo(() => ({ "x-admin-password": password }), [password]);

  const filteredProducts = products.filter((product) =>
    `${product.nameRu} ${product.nameKk} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const loadAdminData = async () => {
    setIsLoading(true);
    setNotice("");
    const [productResponse, orderResponse] = await Promise.all([
      fetch("/api/admin/products", { headers }),
      fetch("/api/admin/orders", { headers }),
    ]);

    if (!productResponse.ok || !orderResponse.ok) {
      setNotice("Проверьте пароль администратора");
      setIsUnlocked(false);
      setIsLoading(false);
      return;
    }

    const productData = await productResponse.json();
    const orderData = await orderResponse.json();
    setProducts(productData.products || []);
    setOrders(orderData.orders || []);
    setIsUnlocked(true);
    setIsLoading(false);
  };

  useEffect(() => {
    if (password && isUnlocked) {
      localStorage.setItem("admin-password", password);
    }
  }, [isUnlocked, password]);

  const saveProduct = async () => {
    const response = await fetch(
      productForm.id ? `/api/admin/products/${productForm.id}` : "/api/admin/products",
      {
        method: productForm.id ? "PUT" : "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(productForm),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.message || "Ошибка сохранения товара");
      return;
    }
    setNotice("Товар сохранен");
    setProductForm(emptyProduct);
    await loadAdminData();
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.message || "Ошибка обновления заказа");
      return;
    }
    setOrders((current) => current.map((item) => (item.id === order.id ? data.order : item)));
  };

  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rows = await readSheet(file);
    const [headerRow, ...bodyRows] = rows;
    const headersMap = new Map(
      headerRow.map((cell, index) => [String(cell || "").trim().toLowerCase(), index]),
    );

    const value = (row: unknown[], names: string[]) => {
      for (const name of names) {
        const index = headersMap.get(name.toLowerCase());
        if (index !== undefined) return row[index];
      }
      return "";
    };

    const importedProducts = bodyRows.map((row) => ({
      nameRu: String(value(row, ["nameRu", "Название RU", "Название"]) || ""),
      nameKk: String(value(row, ["nameKk", "Название KZ", "Атауы"]) || ""),
      descriptionRu: String(value(row, ["descriptionRu", "Описание RU", "Описание"]) || ""),
      descriptionKk: String(value(row, ["descriptionKk", "Описание KZ", "Сипаттама"]) || ""),
      category: String(value(row, ["category", "Категория"]) || "Разное"),
      price: Number(value(row, ["price", "Цена", "Баға"]) || 0),
      stock: Number(value(row, ["stock", "Остаток", "Қалдық"]) || 0),
      imageUrl: String(value(row, ["imageUrl", "Фото", "Ссылка на фото"]) || ""),
      active: true,
    }));

    const response = await fetch("/api/admin/import", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ products: importedProducts }),
    });
    const data = await response.json();
    setNotice(response.ok ? `Импортировано товаров: ${data.products.length}` : data.message);
    await loadAdminData();
  };

  if (!isUnlocked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4 text-[#1f2933]">
        <section className="w-full max-w-sm rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-[#115e59]">
            <ArrowLeft size={16} />
            На сайт
          </Link>
          <h1 className="text-xl font-semibold">Панель продавца</h1>
          <p className="mt-1 text-sm text-[#667085]">Введите пароль продавца</p>
          <input
            className="mt-4 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#115e59]"
            type="password"
            value={password}
            placeholder="Пароль"
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadAdminData();
            }}
          />
          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#115e59] font-semibold text-white"
            onClick={loadAdminData}
          >
            <CheckCircle2 size={18} />
            Войти
          </button>
          {notice && <p className="mt-3 text-sm text-[#b42318]">{notice}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1f2933]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#115e59]">
            <ArrowLeft size={16} />
            На сайт
          </Link>
          <h1 className="flex-1 text-xl font-semibold">Панель продавца</h1>
          <label className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]"
              size={18}
            />
            <input
              className="h-10 w-full rounded-md border border-black/15 pl-10 pr-3 outline-none focus:border-[#115e59]"
              placeholder="Поиск товаров"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-black/15 px-3 text-sm font-semibold"
            onClick={loadAdminData}
          >
            <RefreshCw size={16} />
            {isLoading ? "..." : "Обновить"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[420px_1fr] md:px-8">
        <section className="space-y-5">
          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <PackagePlus size={20} />
              Товар
            </h2>
            <div className="grid gap-2">
              {[
                ["nameRu", "Название RU"],
                ["nameKk", "Название KZ"],
                ["descriptionRu", "Описание RU"],
                ["descriptionKk", "Описание KZ"],
                ["category", "Категория"],
                ["imageUrl", "Ссылка на фото"],
              ].map(([key, label]) => (
                <input
                  key={key}
                  className="h-10 rounded-md border border-black/15 px-3 outline-none focus:border-[#115e59]"
                  placeholder={label}
                  value={String(productForm[key as keyof ProductInput] || "")}
                  onChange={(event) =>
                    setProductForm({ ...productForm, [key]: event.target.value })
                  }
                />
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="h-10 rounded-md border border-black/15 px-3 outline-none focus:border-[#115e59]"
                  type="number"
                  placeholder="Цена KZT"
                  value={productForm.price || ""}
                  onChange={(event) =>
                    setProductForm({ ...productForm, price: Number(event.target.value) })
                  }
                />
                <input
                  className="h-10 rounded-md border border-black/15 px-3 outline-none focus:border-[#115e59]"
                  type="number"
                  placeholder="Остаток"
                  value={productForm.stock || ""}
                  onChange={(event) =>
                    setProductForm({ ...productForm, stock: Number(event.target.value) })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={productForm.active}
                  onChange={(event) =>
                    setProductForm({ ...productForm, active: event.target.checked })
                  }
                />
                Показывать товар на сайте
              </label>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#115e59] font-semibold text-white"
                onClick={saveProduct}
              >
                <Save size={18} />
                Сохранить
              </button>
            </div>
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <FileSpreadsheet size={20} />
              Импорт Excel
            </h2>
            <input
              type="file"
              accept=".xlsx"
              className="block w-full text-sm"
              onChange={importExcel}
            />
            <p className="mt-3 text-sm leading-5 text-[#667085]">
              Поддерживаются колонки: Название RU, Название KZ, Описание RU, Описание KZ,
              Категория, Цена, Остаток, Ссылка на фото.
            </p>
          </div>

          {notice && (
            <div className="rounded-md border border-[#115e59]/20 bg-[#e8f3ef] p-3 text-sm text-[#115e59]">
              {notice}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Заказы</h2>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-md bg-[#fff7ed] px-2 py-1 text-[#c2410c]">
                  Новые: {orders.filter((order) => order.status === "new").length}
                </span>
                <span className="rounded-md bg-[#e8f3ef] px-2 py-1 text-[#115e59]">
                  Подтверждено: {orders.filter((order) => order.status === "confirmed").length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {orders.length === 0 && <p className="text-sm text-[#667085]">Заказов пока нет</p>}
              {orders.map((order) => {
                const whatsappUrl = getWhatsAppUrl(order.customer.phone);

                return (
                  <article key={order.id} className="rounded-md border border-black/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{order.id}</h3>
                        <p className="text-sm text-[#667085]">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-sm font-semibold ${statusStyles[order.status]}`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="mt-3 rounded-md bg-[#f8fafc] p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{order.customer.name}</strong>
                        <span className="text-[#667085]">
                          {formatPhoneForDisplay(order.customer.phone)}
                        </span>
                        {whatsappUrl && (
                          <a
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#25d366] px-2 text-xs font-semibold text-white"
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle size={14} />
                            WhatsApp
                          </a>
                        )}
                      </div>
                      <p className="mt-2 text-[#667085]">
                        {order.fulfillment.type === "delivery" ? "Доставка" : "Самовывоз"}
                        {order.fulfillment.address ? ` · ${order.fulfillment.address}` : ""}
                      </p>
                      {order.fulfillment.comment && (
                        <p className="mt-1 text-[#667085]">{order.fulfillment.comment}</p>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      {order.items.map((item) => (
                        <div key={item.productId} className="flex justify-between gap-3">
                          <span>
                            {item.nameRu} x {item.quantity}
                          </span>
                          <strong>{formatMoney(item.price * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3">
                      <strong>{formatMoney(order.total)}</strong>
                      <div className="flex flex-wrap gap-2">
                        {(["confirmed", "rejected", "completed"] as OrderStatus[]).map((status) => (
                          <button
                            key={status}
                            className="h-9 rounded-md border border-black/15 px-3 text-sm font-semibold hover:bg-[#f8fafc]"
                            onClick={() => updateStatus(order, status)}
                            disabled={order.status === status}
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Товары</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredProducts.map((product) => (
                <article key={product.id} className="flex gap-3 rounded-md border border-black/10 p-3">
                  <img
                    src={product.imageUrl}
                    alt={product.nameRu}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{product.nameRu}</h3>
                    <p className="text-sm text-[#667085]">{product.category}</p>
                    <p className="text-sm">
                      {formatMoney(product.price)} · остаток {product.stock}
                    </p>
                    <button
                      className="mt-2 h-8 rounded-md border border-black/15 px-3 text-sm font-semibold"
                      onClick={() => setProductForm(product)}
                    >
                      Редактировать
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
