import { formatMoney } from "./i18n";
import { formatPhoneForDisplay, getWhatsAppUrl } from "./phone";
import { updateOrderStatus } from "./store";
import type { Order, OrderStatus } from "./types";

const statusLabels: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтвержден",
  rejected: "Отклонен",
  completed: "Завершен",
};

export async function sendTelegramOrder(order: Order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const whatsappUrl = getWhatsAppUrl(order.customer.phone);

  if (!token || !chatId) {
    return { skipped: true };
  }

  const lines = [
    `Новый заказ ${order.id}`,
    `Клиент: ${order.customer.name}`,
    `Телефон: ${formatPhoneForDisplay(order.customer.phone)}`,
    `Получение: ${order.fulfillment.type === "delivery" ? "доставка" : "самовывоз"}`,
    order.fulfillment.address ? `Адрес: ${order.fulfillment.address}` : "",
    order.fulfillment.comment ? `Комментарий: ${order.fulfillment.comment}` : "",
    "",
    ...order.items.map(
      (item) =>
        `${item.nameRu} x ${item.quantity} = ${formatMoney(item.price * item.quantity)}`,
    ),
    "",
    `Итого товары: ${formatMoney(order.total)}`,
  ].filter(Boolean);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      reply_markup: {
        inline_keyboard: [
          ...(whatsappUrl
            ? [[{ text: "Написать в WhatsApp", url: whatsappUrl }]]
            : []),
          [
            { text: "Подтвердить", callback_data: `order:${order.id}:confirmed` },
            { text: "Отклонить", callback_data: `order:${order.id}:rejected` },
          ],
          [{ text: "Завершить", callback_data: `order:${order.id}:completed` }],
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Не удалось отправить Telegram-уведомление");
  }

  return response.json();
}

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      chat: { id: number };
      message_id: number;
    };
  };
};

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const query = update.callback_query;
  const [, orderId, status] = query?.data?.split(":") || [];

  if (!token || !query || !orderId || !isStatus(status)) {
    return { ok: true };
  }

  const order = await updateOrderStatus(orderId, status);

  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      callback_query_id: query.id,
      text: `Заказ ${order.id}: ${statusLabels[order.status]}`,
    }),
  });

  return { ok: true, order };
}

function isStatus(value: string | undefined): value is OrderStatus {
  return value === "confirmed" || value === "rejected" || value === "completed";
}
