# Logic Finance

Кросс-валютный (₽/$) финансовый помощник. Стиль «Терминал». Next.js + Supabase + Vercel.

## Что уже внутри
Рабочее приложение с экраном **«Обзор»** на живых данных из Supabase (капитал, зоны RUB/USD, список счетов).

## Локальный запуск
```bash
npm install
npm run dev        # http://localhost:3000
```
`.env.local` уже заполнен публичными ключами Supabase — ничего вводить не нужно.

## Деплой
```bash
git init && git add . && git commit -m "logic finance: overview on live data"
git branch -M main
git remote add origin https://github.com/dimashibakov/logic-finance.git
git push -u origin main
```
Vercel (проект `logic-finance` уже связан с репо) сам определит Next.js и задеплоит.
В Vercel → Settings → Environment Variables убедись, что есть:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Структура
```
app/
  layout.tsx      # шрифты, html-каркас
  page.tsx        # экран «Обзор» (server component, читает Supabase)
  globals.css
lib/
  supabase.ts     # клиент Supabase
  tokens.ts       # дизайн-токены «Терминал»
supabase-schema.sql  # схема БД (уже применена к проекту)
.env.local        # публичные ключи (готово)
```

## Supabase
- URL: https://rshxjbabyrgsevddtwzf.supabase.co (проект Logic Finance, отдельная личная орг)
- 7 таблиц, засеяны реальными данными (22 счёта, 19 категорий, 14 обязательств, 28 операций).

## Дальше
1. Экраны Курсы · Конвертация · Долги · План (компоненты из прототипа `finance-terminal-5screens.jsx`).
2. Коннекторы ZenMoney (РФ) / Teller (US).
3. Агент (Claude Agent SDK): категоризация, разнесение, мониторинг, идеи.
4. PWA-манифест → установка на iPhone; позже натив под Apple $99.

## ⚠️ Безопасность
Сейчас у таблиц RLS выключен (данные читаются публичным ключом — ок для дев/личного). Перед «боевым» использованием включи RLS + auth в Supabase.
