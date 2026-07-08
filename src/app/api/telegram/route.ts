import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actual = request.headers.get("x-telegram-bot-api-secret-token");

  if (secret && actual !== secret) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await handleTelegramUpdate(await request.json());
  return NextResponse.json(result);
}
