import { NextResponse } from "next/server";
import { assertAdminPassword, importProducts } from "@/lib/store";
import type { ProductInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const { products } = (await request.json()) as { products: ProductInput[] };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ message: "Нет товаров для импорта" }, { status: 400 });
    }

    const imported = await importProducts(products);
    return NextResponse.json({ products: imported });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка импорта" },
      { status: 400 },
    );
  }
}
