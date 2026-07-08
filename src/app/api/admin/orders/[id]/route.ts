import { NextResponse } from "next/server";
import { assertAdminPassword, updateOrderStatus } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

type Params = {
  params: Promise<{ id: string }>;
};

const statuses: OrderStatus[] = ["new", "confirmed", "rejected", "completed"];

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const { id } = await params;
    const { status } = (await request.json()) as { status: OrderStatus };

    if (!statuses.includes(status)) {
      return NextResponse.json({ message: "Неверный статус" }, { status: 400 });
    }

    const order = await updateOrderStatus(id, status);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка обновления заказа" },
      { status: 400 },
    );
  }
}
