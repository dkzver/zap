# АвтоРазборка 3D — Симулятор Погрузчика

Полностью статическая 3D low-poly игра на **Three.js + React + Vite** (без серверной части и внешних ассетов).

## Локальный запуск и сборка статики

```bash
npm install
npm run dev      # режим разработки
npm run build    # сборка статических файлов в папку dist/
```

После `npm run build` в папке `dist/` формируется полностью автономный статический сайт с относительными путями (`base: './'`), готовый к публикации на GitHub Pages, Netlify, Vercel или любом статическом хостинге.

## Публикация на GitHub Pages

1. Создайте новый пустой репозиторий на GitHub (например, `avtorazborka-3d`).
2. Инициализируйте git и отправьте проект в ветку `main`:

```bash
git init
git add .
git commit -m "Initial commit: 3D low-poly forklift game"
git branch -M main
git remote add origin https://github.com/<ваш-логин>/<имя-репозитория>.git
git push -u origin main
```

3. В настройках репозитория откройте **Settings → Pages → Build and deployment → Source** и выберите **GitHub Actions**.
4. Готовый workflow `.github/workflows/deploy.yml` автоматически соберёт `dist/` и опубликует игру по адресу `https://<ваш-логин>.github.io/<имя-репозитория>/`.
