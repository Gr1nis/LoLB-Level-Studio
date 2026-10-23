# 🏮 LoLB Level Studio — Автономная Веб-Студия Редактирования Уровней

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-emerald?style=for-the-badge&logo=github)](https://gr1nis.github.io/LoLB-Level-Studio/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)

**LoLB Level Studio** — это полностью автономный визуальный веб-редактор уровней и интерактивная среда левел-дизайна для мобильной игры **Library of the Losts (`LoLB` — PandaGames)**.

> 🌐 **Онлайн-версия (GitHub Pages):**  
> 👉 **[https://gr1nis.github.io/LoLB-Level-Studio/](https://gr1nis.github.io/LoLB-Level-Studio/)**  
> *(Работает полностью автономно в браузере с локальным хранением через `localStorage`, выгрузкой JSON и встроенным клиентским JS-солвером).*

---

## 🌟 Возможности и игровые режимы

Студия создана для быстрого проектирования, балансировки и автоматической верификации уровней для двух ключевых кор-режимов игры:

### 1. 🎋 Бамбуковая почта (`BambooPost` — Spatial Bin Packing)
* **Интерактивная сетка стола**: настраиваемые размеры (по умолчанию $6 \times 6$), переключение заблокированных клеток-препятствий (`blockedCells`, кляксы чернил) одним кликом.
* **Каталог полиомино-посылок**: палитра из 16 предметов (1-клеточные монетки, 2-клеточные перья, 3-клеточные свитки/ключи, 4-клеточные книги/банки меда, 5-клеточные артефакты).
* **Свободное вращение**: поворот фигур на $90^\circ$ по клавише `R` или `Space`.
* **Автоматическое заполнение дыр**: кнопка превращения оставшихся пустых островков в чернильные кляксы.
* **Метрика плотности упаковки (BFS FloodFill)**:
  * В реальном времени рассчитывает связные пустые островки по формуле:
    $$\text{DensityMultiplier} = \max(0.3, 1.0 - 0.15 \times \max(0, \text{islands} - 1))$$
  * Автоматический расчет награды в монетках:
    $$\text{Coins} = 30 + \text{round}(20 \times \text{DensityMultiplier})$$

### 2. 📚 Полочный дзен (`ShelfZen` — Shelf Sorting Puzzle)
* **Конструктор полок**: динамическое добавление полок (обычная, верхняя, средняя, нижняя) с 3 слотами на каждой.
* **Каталог книг**: выбор высоты (от XS до XL, $60\text{px} \dots 160\text{px}$) и цветовой гаммы (синий, красный, оранжевый, черный/графит).
* **Статические якоря (`isStatic`)**: фиксация подсказок-ориентиров кликом по замочку 🔒 / 🔓.
* **5 правил валидации полок**:
  1. `TargetSlot` — книга должна стоять строго в целевом слоте (`targetSlotIndex`).
  2. `ColorMatch` — все книги на полке должны быть одного цвета.
  3. `HeightAscending` — лесенка вверх (строго возрастающая высота слева направо).
  4. `HeightDescending` — лесенка вниз (строго убывающая высота слева направо).
  5. `HeightOrder` — любая монотонная лесенка (возрастание или убывание).
* **Мгновенная подсветка статуса**: визуальная валидация правил полки в реальном времени (зеленый/красный бейдж).

### 3. 🤖 AI Co-op Солвер (Двухуровневый бэктрекинг)
* **Локальный Python-солвер (`solver.py`)**: высокопроизводительный бэктрекинг с эвристикой First-Fit Decreasing и учетом симметрии вращений. Вызывается по REST API `/api/ai/solve-post`.
* **Клиентский JS-солвер (`solvePolyominoClient`)**: встроенный JavaScript-солвер, работающий прямо в браузере при открытии редактора на GitHub Pages без поднятого бэкенда.
* **Пошаговая анимация раскладки**: анимированное размещение каждой посылки в реальном времени с подсветкой ячеек.

---

## 🚀 Быстрый запуск

### Вариант 1: Скрипт быстрого запуска (Рекомендуется)

```bash
git clone git@github.com:Gr1nis/LoLB-Level-Studio.git
cd LoLB-Level-Studio

# Запуск сервера и автоматическое открытие в браузере:
./run_studio.sh
```

Редактор автоматически откроется по адресу:  
👉 **[http://localhost:8080](http://localhost:8080)**

---

### Вариант 2: Прямой запуск через Python

Студия написана на чистой стандартной библиотеке Python 3.9+ и не требует внешних зависимостей (`pip` не нужен):

```bash
python3 server.py
# или на произвольном порту:
PORT=9090 python3 server.py
```

---

### Вариант 3: Docker & Docker Compose

```bash
# Запуск в фоновом режиме
docker compose up -d --build

# Просмотр логов
docker compose logs -f

# Остановка
docker compose down
```

Папка `./data/` автоматически примонтирована в контейнер, сохраняя созданные уровни на хост-машине.

---

## 🎮 Горячие клавиши

| Хоткей | Действие |
| :---: | :--- |
| <kbd>R</kbd> или <kbd>Space</kbd> | Повернуть фигуру на $90^\circ$ по часовой стрелке |
| <kbd>Delete</kbd> или <kbd>Backspace</kbd> | Удалить выбранную фигуру из подноса уровня |
| **Клик по сетке стола** | Переключить статус клетки (пустая ⬜ ↔ клякса 🚫) |
| **Клик по замочку 🔒/🔓** | Заблокировать книгу в слоте полки как статический якорь |

---

## 📦 Форматы экспорта и синхронизация с Unity

При нажатии кнопки **«Сохранить в Unity»**:
* В локальном режиме: сохраняет JSON-файлы в папку `./data/` и (если рядом обнаружен репозиторий `LoLB`) автоматически зеркалирует изменения в `Assets/StreamingAssets/`.
* В режиме GitHub Pages: автоматически сохраняет состояние в `localStorage` браузера и скачивает обновленный JSON-файл на компьютер.

### 1. `data/post_levels.json` (Бамбуковая почта)
```json
{
    "levels": [
        {
            "id": 1,
            "gridWidth": 6,
            "gridHeight": 6,
            "shapes": [
                { "shapeId": "Keys" },
                { "shapeId": "Honey" }
            ],
            "tutorialId": "tutorial_1",
            "blockedCells": [
                { "x": 0, "y": 0 }
            ],
            "freeCells": []
        }
    ]
}
```

### 2. `data/book_levels.json` (Полочный дзен)
```json
{
    "levels": [
        {
            "id": 1,
            "tutorialId": "",
            "shelves": [
                {
                    "shelfId": "shelf_1",
                    "prefabId": "shelf",
                    "position": { "x": 0, "y": 0 },
                    "staticSlots": [
                        { "index": 0, "isStatic": true }
                    ],
                    "rules": [ "TargetSlot" ]
                }
            ],
            "placements": [
                { "itemId": "6", "spriteId": "blue0", "shelfId": "shelf_1", "targetSlotIndex": 0 },
                { "itemId": "5", "spriteId": "black0", "shelfId": "shelf_1", "targetSlotIndex": 1 },
                { "itemId": "4", "spriteId": "orange1", "shelfId": "shelf_1", "targetSlotIndex": 2 }
            ]
        }
    ]
}
```

---

## 📁 Структура автономного репозитория

```
LoLB-Level-Studio/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml   # Автоматический деплой корня на GitHub Pages
├── .gitignore                 # Игнорирование кеша Python и системных файлов
├── .nojekyll                  # Отключение Jekyll для корректного хостинга GitHub Pages
├── Dockerfile                 # Легковесный контейнер python:3.11-alpine
├── docker-compose.yml         # Конфигурация запуска с маппингом портов и data/
├── README.md                  # Документация проекта
├── run_studio.sh              # Скрипт запуска сервера и открытия браузера
├── server.py                  # Standalone HTTP & SSE сервер (чистый Python)
├── solver.py                  # Бэктрекинг-солвер упаковки полиомино
├── test_qa_verification.py    # Набор тестов синтаксиса, каталогов и алгоритма
├── index.html                 # Главный интерфейс студии (Tailwind UI)
├── js/
│   ├── app.js                 # Главный оркестратор и роутер событий
│   ├── state.js               # Централизованное состояние и работа с хранилищем
│   ├── bamboo_post.js         # Логика сетки посылок, препятствий и BFS
│   ├── shelf_zen.js           # Логика полок, книг, правил и якорей
│   └── ai_bridge.js           # AI Co-op, SSE-стриминг и клиентский JS-солвер
└── data/
    ├── book_levels.json       # База уровней ShelfZen (10+ уровней)
    ├── post_levels.json       # База уровней BambooPost (10+ уровней)
    ├── shapes_catalog.json    # Каталог геометрии посылок и цветов
    └── rules_catalog.json     # Каталог правил, цветов и префабов полок
```

---

## 🧪 Тестирование и верификация

Для запуска автоматической верификации синтаксиса, каталогов данных, сигнатур функций и алгоритма солвера:

```bash
python3 test_qa_verification.py
```

---

## 👨‍💻 Авторство и команда

* **Разработчик и геймдизайнер**: [Егор Белогубец (Gr1nis)](https://github.com/Gr1nis)
* **Проект**: Library of the Losts (`LoLB`) — PandaGames Studio.
