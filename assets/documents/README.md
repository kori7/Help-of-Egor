# Медицинские документы (PDF)

Сюда клади PDF-справки/выписки Егора.

## Как добавить

1. Положи файл сюда, например `vypiska-gorbacheva.pdf`.
2. Открой `assets/js/main.js`, найди массив `DOCUMENTS` (в начале файла).
3. Добавь строку:

```js
const DOCUMENTS = [
  { title: "Выписка НИИ им. Горбачёвой", file: "assets/documents/vypiska-gorbacheva.pdf" },
  { title: "Заключение центра Рогачёва",  file: "assets/documents/zaklyuchenie-rogacheva.pdf" },
  // ...
];
```

`title` — подпись в модалке, `file` — путь к PDF.

Если массив пуст — в модалке показывается заглушка «Документы скоро будут добавлены».
