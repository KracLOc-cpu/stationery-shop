import { NextResponse } from "next/server";
import { assertAdminPassword, listProducts, saveProduct } from "@/lib/store";
import type { ProductInput } from "@/lib/types";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const { id } = await params;
    const product = await saveProduct({
      ...((await request.json()) as ProductInput),
      id,
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка обновления товара" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const { id } = await params;
    const product = (await listProducts(false)).find((item) => item.id === id);
    if (!product) {
      return NextResponse.json({ message: "Товар не найден" }, { status: 404 });
    }
    const updated = await saveProduct({ ...product, active: false });
    return NextResponse.json({ product: updated });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка удаления товара" },
      { status: 400 },
    );
  }
}
