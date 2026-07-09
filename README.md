# Kense Market

Мобильный каталог канцтоваров для Казахстана: товары RU/KZ, корзина, оформление заказа без регистрации, панель продавца, импорт Excel и Telegram-уведомления.

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`.

Админка: `http://localhost:3000/admin`.
Пароль задается переменной `ADMIN_PASSWORD`.

## Для продавца

- Каталог: покупатель открывает сайт, выбирает товары, оставляет имя и телефон.
- Заказ: продавец получает уведомление в Telegram и видит заказ в админке.
- Подтверждение: заказ можно подтвердить, отклонить или завершить в Telegram или админке.
- Товары: в админке можно добавлять, редактировать, скрывать с сайта и возвращать товары.
- Остатки: при заказе остаток товара уменьшается автоматически.
- WhatsApp: в Telegram и админке есть ссылка для быстрого сообщения клиенту.

Продакшен-ссылки:

- Сайт: `https://stationery-shop-dun.vercel.app`
- Админка: `https://stationery-shop-dun.vercel.app/admin`

## Данные

Без Supabase приложение хранит данные в `data/store.json`. Это удобно для демонстрации и локального старта.

Для Supabase:

1. Создайте проект Supabase.
2. Откройте `SQL Editor` и выполните SQL из `supabase/schema.sql`.
3. В Supabase откройте `Project Settings -> API`.
4. Скопируйте `Project URL` в `NEXT_PUBLIC_SUPABASE_URL`.
5. Скопируйте `service_role` key в `SUPABASE_SERVICE_ROLE_KEY`.
6. Добавьте эти переменные в Vercel: `Project -> Settings -> Environment Variables`.
7. Redeploy проекта в Vercel.

Если таблица `products` пустая, приложение автоматически загрузит стартовые демо-товары в Supabase при первом открытии каталога.

## Telegram

Укажите `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`, чтобы продавец получал новые заказы.

Для кнопок подтверждения настройте webhook:

```bash
curl "https://api.telegram.org/bot<token>/setWebhook" \
  -d "url=https://your-domain.com/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Импорт Excel

Поддерживаемые колонки: `Название RU`, `Название KZ`, `Описание RU`, `Описание KZ`, `Категория`, `Цена`, `Остаток`, `Ссылка на фото`.
