"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { copy, formatMoney } from "@/lib/i18n";
import { normalizePhone } from "@/lib/phone";
import type { FulfillmentType, Locale, Product } from "@/lib/types";

type CartLine = {
  product: Product;
  quantity: number;
};

const cartStorageKey = "kense-cart";

const categoryLabel = (item: string, allLabel: string) => (item === "all" ? allLabel : item);

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};

    try {
      return JSON.parse(localStorage.getItem(cartStorageKey) || "{}");
    } catch {
      return {};
    }
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", comment: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState("");
  const t = copy[locale];

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setNotice("Не удалось загрузить товары"))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products.filter((product) => {
      const title = locale === "ru" ? product.nameRu : product.nameKk;
      const description = locale === "ru" ? product.descriptionRu : product.descriptionKk;
      const matchesQuery = `${title} ${description}`.toLowerCase().includes(normalized);
      const matchesCategory = category === "all" || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, locale, products, query]);

  const cartLines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter(Boolean) as CartLine[],
    [cart, products],
  );

  const total = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const cartItemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  const setQuantity = (product: Product, quantity: number) => {
    setCart((current) => {
      const next = { ...current };
      const safeQuantity = Math.max(0, Math.min(quantity, product.stock));

      if (safeQuantity === 0) {
        delete next[product.id];
      } else {
        next[product.id] = safeQuantity;
      }

      return next;
    });
  };

  const submitOrder = async () => {
    setNotice("");
    setIsSending(true);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customer: { name: customer.name, phone: customer.phone },
        fulfillment: {
          type: fulfillment,
          address: fulfillment === "delivery" ? customer.address : "",
          comment: customer.comment,
        },
        items: cartLines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      }),
    });

    const data = await response.json();
    setIsSending(false);

    if (!response.ok) {
      setNotice(data.message || "Ошибка отправки заказа");
      return;
    }

    setCart({});
    setCustomer({ name: "", phone: "", address: "", comment: "" });
    setNotice(`${t.orderSent} №${data.order.id}`);
    const productResponse = await fetch("/api/products");
    const productData = await productResponse.json();
    setProducts(productData.products || []);
  };

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#1e2930]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#fbfaf6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0f766e] text-white shadow-sm">
            <ShoppingBag size={21} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{t.brand}</h1>
            <p className="truncate text-sm text-[#64748b]">{t.subtitle}</p>
          </div>
          <Link
            href="/admin"
            className="hidden h-10 items-center rounded-md border border-black/15 bg-white px-3 text-sm font-semibold hover:border-[#0f766e] md:inline-flex"
          >
            {t.admin}
          </Link>
          <button
            className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm font-bold hover:border-[#0f766e]"
            onClick={() => setLocale(locale === "ru" ? "kk" : "ru")}
          >
            {t.lang}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 md:grid-cols-[1fr_390px] md:px-8">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black leading-tight md:text-3xl">Каталог канцтоваров</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {products.length ? `${products.length} товаров в наличии` : "Загрузка товаров..."}
              </p>
            </div>
            <a
              href="#checkout"
              className="hidden h-10 items-center gap-2 rounded-md bg-[#0f766e] px-3 text-sm font-bold text-white md:inline-flex"
            >
              <ShoppingCart size={16} />
              Корзина: {cartItemCount}
            </a>
          </div>

          <div className="sticky top-[69px] z-20 mb-4 rounded-md border border-black/10 bg-[#fbfaf6]/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                  size={18}
                  aria-hidden
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.search}
                  className="h-12 w-full rounded-md border border-black/15 bg-white pl-10 pr-3 outline-none focus:border-[#0f766e]"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`h-12 shrink-0 rounded-md border px-4 text-sm font-bold ${
                      category === item
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-black/15 bg-white text-[#334155] hover:border-[#0f766e]"
                    }`}
                  >
                    {categoryLabel(item, t.all)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-md border border-black/10 bg-white p-3">
                  <div className="aspect-[4/3] rounded-md bg-[#e7dfd2]" />
                  <div className="mt-3 h-5 rounded bg-[#e7dfd2]" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-[#e7dfd2]" />
                  <div className="mt-4 h-10 rounded bg-[#e7dfd2]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => {
                const title = locale === "ru" ? product.nameRu : product.nameKk;
                const description = locale === "ru" ? product.descriptionRu : product.descriptionKk;
                const quantity = cart[product.id] || 0;

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-md border border-black/10 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#e9e3d7]">
                      <img
                        src={product.imageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-[#0f766e] shadow-sm">
                        {product.category}
                      </span>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="text-base font-bold leading-6">{title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#64748b]">
                          {description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">{formatMoney(product.price)}</p>
                          <p className="text-sm text-[#64748b]">
                            {product.stock > 0 ? `${t.stock}: ${product.stock}` : t.out}
                          </p>
                        </div>
                        {quantity > 0 ? (
                          <div className="flex h-11 items-center rounded-md border border-black/15 bg-[#f8fafc]">
                            <button
                              className="grid h-11 w-10 place-items-center"
                              onClick={() => setQuantity(product, quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                            <button
                              className="grid h-11 w-10 place-items-center"
                              onClick={() => setQuantity(product, quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#d9480f] px-3 text-sm font-bold text-white hover:bg-[#c2410c] disabled:bg-[#cbd5e1]"
                            disabled={product.stock === 0}
                            onClick={() => setQuantity(product, 1)}
                          >
                            <ShoppingCart size={16} />
                            {t.add}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside
          id="checkout"
          className="h-fit rounded-md border border-black/10 bg-white p-4 shadow-sm md:sticky md:top-24"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">{t.cart}</h2>
              <p className="text-sm text-[#64748b]">Проверьте позиции перед отправкой</p>
            </div>
            <span className="rounded-md bg-[#0f766e] px-2 py-1 text-sm font-bold text-white">
              {cartItemCount}
            </span>
          </div>

          {cartLines.length === 0 ? (
            <div className="rounded-md border border-dashed border-black/15 bg-[#fbfaf6] p-6 text-center text-sm text-[#64748b]">
              <Package className="mx-auto mb-2 text-[#0f766e]" size={30} />
              {t.emptyCart}
            </div>
          ) : (
            <div className="space-y-3">
              {cartLines.map((line) => {
                const title = locale === "ru" ? line.product.nameRu : line.product.nameKk;

                return (
                  <div key={line.product.id} className="flex gap-3 border-b border-black/10 pb-3">
                    <img
                      src={line.product.imageUrl}
                      alt={title}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{title}</p>
                      <p className="text-sm text-[#64748b]">
                        {line.quantity} x {formatMoney(line.product.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-black/15 hover:border-[#0f766e]"
                          onClick={() => setQuantity(line.product, line.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-black/15 hover:border-[#0f766e]"
                          onClick={() => setQuantity(line.product, line.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-black/15 text-[#b42318] hover:border-[#b42318]"
                          onClick={() => setQuantity(line.product, 0)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-md bg-[#f8fafc] p-3">
                <div className="flex justify-between text-sm">
                  <span>{t.total}</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748b]">{t.deliveryNote}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["pickup", "delivery"] as FulfillmentType[]).map((type) => (
                  <button
                    key={type}
                    className={`h-11 rounded-md border text-sm font-bold ${
                      fulfillment === type
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-black/15 bg-white hover:border-[#0f766e]"
                    }`}
                    onClick={() => setFulfillment(type)}
                  >
                    {type === "pickup" ? t.pickup : t.delivery}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <input
                  className="h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#0f766e]"
                  autoComplete="name"
                  placeholder={t.customerName}
                  value={customer.name}
                  onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                />
                <input
                  className="h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#0f766e]"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={t.phone}
                  type="tel"
                  value={customer.phone}
                  onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                />
                {fulfillment === "delivery" && (
                  <input
                    className="h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#0f766e]"
                    placeholder={t.address}
                    value={customer.address}
                    onChange={(event) =>
                      setCustomer({ ...customer, address: event.target.value })
                    }
                  />
                )}
                <textarea
                  className="min-h-20 w-full rounded-md border border-black/15 px-3 py-2 outline-none focus:border-[#0f766e]"
                  placeholder={t.comment}
                  value={customer.comment}
                  onChange={(event) => setCustomer({ ...customer, comment: event.target.value })}
                />
              </div>

              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0f766e] font-bold text-white hover:bg-[#115e59] disabled:bg-[#94a3b8]"
                disabled={isSending || !customer.name || normalizePhone(customer.phone).length < 10}
                onClick={submitOrder}
              >
                <Check size={18} />
                {isSending ? "Отправляем..." : t.submit}
              </button>
            </div>
          )}

          {notice && (
            <div className="mt-4 rounded-md border border-[#0f766e]/20 bg-[#e8f3ef] p-3 text-sm font-semibold text-[#0f766e]">
              {notice}
            </div>
          )}
        </aside>
      </div>

      {cartLines.length > 0 && (
        <a
          href="#checkout"
          className="fixed inset-x-4 bottom-4 z-40 flex h-14 items-center justify-between rounded-md bg-[#0f766e] px-4 font-bold text-white shadow-lg md:hidden"
        >
          <span>
            {cartItemCount} в корзине · {formatMoney(total)}
          </span>
          <ChevronRight size={20} />
        </a>
      )}
    </main>
  );
}
