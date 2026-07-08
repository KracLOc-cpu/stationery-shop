import { NextResponse } from "next/server";
import { assertAdminPassword, listProducts, saveProduct } from "@/lib/store";
import type { ProductInput } from "@/lib/types";

export async function GET(request: Request) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const products = await listProducts(false);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка доступа" },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const product = await saveProduct((await request.json()) as ProductInput);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка сохранения товара" },
      { status: 400 },
    );
  }
}
