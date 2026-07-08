import { NextResponse } from "next/server";
import { assertAdminPassword, listOrders } from "@/lib/store";

export async function GET(request: Request) {
  try {
    assertAdminPassword(request.headers.get("x-admin-password"));
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка доступа" },
      { status: 401 },
    );
  }
}
