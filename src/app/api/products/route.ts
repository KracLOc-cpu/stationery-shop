import { NextResponse } from "next/server";
import { listProducts } from "@/lib/store";

export async function GET() {
  try {
    const products = await listProducts(true);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка загрузки товаров" },
      { status: 500 },
    );
  }
}
