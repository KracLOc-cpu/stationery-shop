import { NextResponse } from "next/server";
import { createOrder } from "@/lib/store";
import { sendTelegramOrder } from "@/lib/telegram";
import type { OrderInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderInput;

    if (!body.customer?.name || !body.customer?.phone || !body.items?.length) {
      return NextResponse.json({ message: "Заполните имя, телефон и корзину" }, { status: 400 });
    }

    if (body.fulfillment?.type === "delivery" && !body.fulfillment.address.trim()) {
      return NextResponse.json({ message: "Укажите адрес доставки" }, { status: 400 });
    }

    const order = await createOrder(body);
    await sendTelegramOrder(order);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка создания заказа" },
      { status: 400 },
    );
  }
}
