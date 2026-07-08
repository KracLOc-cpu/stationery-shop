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
Пароль по умолчанию: `admin123`. Для продакшена задайте `ADMIN_PASSWORD` в `.env.local`.

## Данные

Без Supabase приложение хранит данные в `data/store.json`. Это удобно для демонстрации и локального старта.

Для Supabase:

1. Создайте проект Supabase.
2. Выполните SQL из `supabase/schema.sql`.
3. Укажите `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`.

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
