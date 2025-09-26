// Константы для типов клеток
var TILE_TYPES = {
    WALL: 'W',
    FLOOR: '-',
    PLAYER: 'P',
    ENEMY: 'E',
    HEALTH_POTION: 'HP',
    SWORD: 'SW'
};

// Основной класс игры
function Game() {
    this.map = []; // Двумерный массив карты
    this.player = {
        x: 0,
        y: 0,
        health: 100,
        maxHealth: 100,
        attackPower: 10
    };
    this.enemies = [];
    this.items = [];
    this.mapWidth = 40;
    this.mapHeight = 24;
    this.tileSize = 50; // Размер клетки в пикселях
}

// Вспомогательные функции
Game.prototype.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

Game.prototype.shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

// Проверка связности карты
Game.prototype.checkConnectivity = function() {
    // Создаем копию карты для отметки посещенных клеток
    var visited = [];
    for (var y = 0; y < this.mapHeight; y++) {
        visited[y] = [];
        for (var x = 0; x < this.mapWidth; x++) {
            visited[y][x] = false;
        }
    }

    // Находим первую пустую клетку (пол) для начала проверки
    var startX = -1, startY = -1;
    for (var y = 0; y < this.mapHeight; y++) {
        for (var x = 0; x < this.mapWidth; x++) {
            if (this.map[y][x] === TILE_TYPES.FLOOR) {
                startX = x;
                startY = y;
                break;
            }
        }
        if (startX !== -1) break;
    }

    if (startX === -1) return false; // Нет пустых клеток

    // Запускаем Flood Fill для подсчета достижимых клеток
    var queue = [{x: startX, y: startY}];
    visited[startY][startX] = true;
    var reachableCount = 0;
    var totalEmptyCount = 0;

    // Сначала подсчитаем общее количество пустых клеток
    for (var y = 0; y < this.mapHeight; y++) {
        for (var x = 0; x < this.mapWidth; x++) {
            if (this.map[y][x] === TILE_TYPES.FLOOR) {
                totalEmptyCount++;
            }
        }
    }

    // BFS для определения достижимых клеток
    var directions = [
        {dx: 0, dy: -1}, // вверх
        {dx: 1, dy: 0},  // вправо
        {dx: 0, dy: 1},  // вниз
        {dx: -1, dy: 0}  // влево
    ];

    while (queue.length > 0) {
        var cell = queue.shift();
        reachableCount++;

        for (var i = 0; i < directions.length; i++) {
            var newX = cell.x + directions[i].dx;
            var newY = cell.y + directions[i].dy;

            if (newX >= 0 && newX < this.mapWidth &&
                newY >= 0 && newY < this.mapHeight &&
                !visited[newY][newX] &&
                this.map[newY][newX] === TILE_TYPES.FLOOR) {

                visited[newY][newX] = true;
                queue.push({x: newX, y: newY});
            }
        }
    }

    // Карта связна, если все пустые клетки достижимы
    return reachableCount === totalEmptyCount;
};

// Генерация карты
Game.prototype.generateMap = function() {
    // 1. Создаем пустую карту 40x24, заполненную стенами
    this.createEmptyMap();

    // 2. Размещаем комнаты
    this.generateRooms();

    // 3. Создаем проходы (3-5 горизонтальных и 3-5 вертикальных)
    this.generateCorridors();

    // 4. Проверяем и обеспечиваем связность карты
    if (!this.checkConnectivity()) {
        console.log("Карта не связна, применяем исправления...");
        this.ensureConnectivity();
    }

    console.log("Карта успешно сгенерирована");

    // 5. Размещаем объекты и персонажей
    this.placeEntities();
};

// Простой метод обеспечения связности
Game.prototype.ensureConnectivity = function() {
    // Находим все изолированные области
    var areas = this.findIsolatedAreas();

    if (areas.length <= 1) return; // Карта уже связна

    // Сортируем области по размеру
    areas.sort(function(a, b) {
        return b.cells.length - a.cells.length;
    });

    var mainArea = areas[0];

    // Соединяем каждую изолированную область с основной
    for (var i = 1; i < areas.length; i++) {
        var isolatedArea = areas[i];

        // Берем случайную клетку из изолированной области
        var areaCell = isolatedArea.cells[Math.floor(Math.random() * isolatedArea.cells.length)];

        // Берем случайную клетку из основной области
        var mainCell = mainArea.cells[Math.floor(Math.random() * mainArea.cells.length)];

        // Соединяем их прямым коридором (сначала по горизонтали, потом по вертикали)
        this.createStraightCorridor(areaCell.x, areaCell.y, mainCell.x, mainCell.y);
    }
};

// Создание прямого коридора между двумя точками
Game.prototype.createStraightCorridor = function(x1, y1, x2, y2) {
    // Горизонтальная часть
    var startX = Math.min(x1, x2);
    var endX = Math.max(x1, x2);
    for (var x = startX; x <= endX; x++) {
        this.map[y1][x] = TILE_TYPES.FLOOR;
    }

    // Вертикальная часть
    var startY = Math.min(y1, y2);
    var endY = Math.max(y1, y2);
    for (var y = startY; y <= endY; y++) {
        this.map[y][x2] = TILE_TYPES.FLOOR;
    }
};

// Поиск изолированных областей
Game.prototype.findIsolatedAreas = function() {
    var visited = [];
    var areas = [];

    // Инициализируем массив посещенных клеток
    for (var y = 0; y < this.mapHeight; y++) {
        visited[y] = [];
        for (var x = 0; x < this.mapWidth; x++) {
            visited[y][x] = false;
        }
    }

    // Поиск областей с помощью BFS
    for (var y = 0; y < this.mapHeight; y++) {
        for (var x = 0; x < this.mapWidth; x++) {
            if (!visited[y][x] && this.map[y][x] === TILE_TYPES.FLOOR) {
                var area = this.floodFillArea(x, y, visited);
                areas.push(area);
            }
        }
    }

    return areas;
};

// Заливка для определения области
Game.prototype.floodFillArea = function(startX, startY, visited) {
    var cells = [];
    var queue = [{x: startX, y: startY}];
    visited[startY][startX] = true;
    cells.push({x: startX, y: startY});

    var directions = [
        {dx: 0, dy: -1}, {dx: 1, dy: 0},
        {dx: 0, dy: 1}, {dx: -1, dy: 0}
    ];

    while (queue.length > 0) {
        var cell = queue.shift();

        for (var i = 0; i < directions.length; i++) {
            var newX = cell.x + directions[i].dx;
            var newY = cell.y + directions[i].dy;

            if (newX >= 0 && newX < this.mapWidth &&
                newY >= 0 && newY < this.mapHeight &&
                !visited[newY][newX] &&
                this.map[newY][newX] === TILE_TYPES.FLOOR) {

                visited[newY][newX] = true;
                cells.push({x: newX, y: newY});
                queue.push({x: newX, y: newY});
            }
        }
    }

    return { cells: cells };
};

// Создание пустой карты, заполненной стенами
Game.prototype.createEmptyMap = function() {
    this.map = [];
    for (var y = 0; y < this.mapHeight; y++) {
        var row = [];
        for (var x = 0; x < this.mapWidth; x++) {
            row.push(TILE_TYPES.WALL);
        }
        this.map.push(row);
    }
};

// Генерация комнат
Game.prototype.generateRooms = function() {
    var rooms = [];
    var roomCount = this.getRandomInt(5, 10);
    var maxAttempts = 100;

    for (var i = 0; i < roomCount; i++) {
        var roomPlaced = false;
        var attempts = 0;

        while (!roomPlaced && attempts < maxAttempts) {
            attempts++;

            var width = this.getRandomInt(3, 8);
            var height = this.getRandomInt(3, 8);
            var x = this.getRandomInt(1, this.mapWidth - width - 1);
            var y = this.getRandomInt(1, this.mapHeight - height - 1);

            // Проверяем, что комната не выходит за границы
            if (x + width >= this.mapWidth || y + height >= this.mapHeight) {
                continue;
            }

            // Проверяем, что комната не пересекается с существующими комнатами
            var canPlace = true;

            // Добавляем зазор в 1 клетку между комнатами
            for (var otherY = y - 1; otherY < y + height + 1; otherY++) {
                for (var otherX = x - 1; otherX < x + width + 1; otherX++) {
                    if (otherY >= 0 && otherY < this.mapHeight &&
                        otherX >= 0 && otherX < this.mapWidth) {
                        // Если клетка уже является полом (частью другой комнаты), нельзя размещать
                        if (this.map[otherY][otherX] === TILE_TYPES.FLOOR) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (!canPlace) break;
            }

            if (canPlace) {
                // Создаем комнату
                for (var roomY = y; roomY < y + height; roomY++) {
                    for (var roomX = x; roomX < x + width; roomX++) {
                        this.map[roomY][roomX] = TILE_TYPES.FLOOR;
                    }
                }

                rooms.push({x: x, y: y, width: width, height: height});
                roomPlaced = true;
                console.log("Комната размещена: " + x + "," + y + " размер " + width + "x" + height);
            }
        }

        if (!roomPlaced) {
            console.log("Не удалось разместить комнату после " + attempts + " попыток");
        }
    }

    console.log("Размещено комнат: " + rooms.length);
    return rooms;
};

// Генерация проходов
Game.prototype.generateCorridors = function() {
    // Горизонтальные проходы (3-5 штук)
    var horizontalCorridors = this.getRandomInt(3, 5);
    var usedY = []; // Чтобы проходы не накладывались друг на друга

    for (var i = 0; i < horizontalCorridors; i++) {
        var y;
        var attempts = 0;

        // Ищем уникальную позицию для прохода
        do {
            y = this.getRandomInt(1, this.mapHeight - 2);
            attempts++;
        } while (usedY.includes(y) && attempts < 20);

        usedY.push(y);

        // Создаем горизонтальный проход через всю карту
        for (var x = 0; x < this.mapWidth; x++) {
            this.map[y][x] = TILE_TYPES.FLOOR;
        }
    }

    // Вертикальные проходы (3-5 штук)
    var verticalCorridors = this.getRandomInt(3, 5);
    var usedX = []; // Чтобы проходы не накладывались друг на друга

    for (var i = 0; i < verticalCorridors; i++) {
        var x;
        var attempts = 0;

        // Ищем уникальную позицию для прохода
        do {
            x = this.getRandomInt(1, this.mapWidth - 2);
            attempts++;
        } while (usedX.includes(x) && attempts < 20);

        usedX.push(x);

        // Создаем вертикальный проход через всю карту
        for (var y = 0; y < this.mapHeight; y++) {
            this.map[y][x] = TILE_TYPES.FLOOR;
        }
    }
};

// Размещение объектов и персонажей
Game.prototype.placeEntities = function() {
    // Собираем все пустые клетки
    var emptyTiles = [];
    for (var y = 0; y < this.mapHeight; y++) {
        for (var x = 0; x < this.mapWidth; x++) {
            if (this.map[y][x] === TILE_TYPES.FLOOR) {
                emptyTiles.push({x: x, y: y});
            }
        }
    }

    // Перемешиваем массив пустых клеток
    this.shuffleArray(emptyTiles);

    // Размещаем игрока
    if (emptyTiles.length > 0) {
        var playerPos = emptyTiles.pop();
        this.player.x = playerPos.x;
        this.player.y = playerPos.y;
    }

    // Размещаем врагов (10 штук)
    for (var i = 0; i < 10; i++) {
        if (emptyTiles.length > 0) {
            var enemyPos = emptyTiles.pop();
            this.enemies.push({
                x: enemyPos.x,
                y: enemyPos.y,
                health: 30,
                maxHealth: 30
            });
        }
    }

    // Размещаем мечи (2 штуки)
    for (var i = 0; i < 2; i++) {
        if (emptyTiles.length > 0) {
            var swordPos = emptyTiles.pop();
            this.items.push({
                x: swordPos.x,
                y: swordPos.y,
                type: TILE_TYPES.SWORD
            });
        }
    }

    // Размещаем зелья здоровья (10 штук)
    for (var i = 0; i < 10; i++) {
        if (emptyTiles.length > 0) {
            var potionPos = emptyTiles.pop();
            this.items.push({
                x: potionPos.x,
                y: potionPos.y,
                type: TILE_TYPES.HEALTH_POTION
            });
        }
    }
};

// Обновление информации об игре в UI
Game.prototype.updateGameInfo = function() {
    document.getElementById('health').textContent = this.player.health;
    document.getElementById('max-health').textContent = this.player.maxHealth;
    document.getElementById('attack-power').textContent = this.player.attackPower;
    document.getElementById('enemies-count').textContent = this.enemies.length;

    // Подсчитываем зелья и мечи
    var potionsCount = 0;
    var swordsCount = 0;
    for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].type === TILE_TYPES.HEALTH_POTION) {
            potionsCount++;
        } else if (this.items[i].type === TILE_TYPES.SWORD) {
            swordsCount++;
        }
    }
    document.getElementById('potions-count').textContent = potionsCount;
    document.getElementById('swords-count').textContent = swordsCount;
};

// Отрисовка игрового поля
Game.prototype.render = function() {
    var field = document.querySelector('.field');
    field.innerHTML = ''; // Очищаем поле

    // Устанавливаем размер игрового поля
    field.style.width = (this.mapWidth * this.tileSize) + 'px';
    field.style.height = (this.mapHeight * this.tileSize) + 'px';

    // Сначала отрисовываем карту
    for (var y = 0; y < this.mapHeight; y++) {
        for (var x = 0; x < this.mapWidth; x++) {
            var tile = document.createElement('div');
            tile.className = 'tile';

            // Добавляем класс в зависимости от типа клетки
            var tileType = this.map[y][x];
            if (tileType !== TILE_TYPES.FLOOR) {
                tile.classList.add('tile' + tileType);
            }

            // Позиционируем клетку
            tile.style.left = (x * this.tileSize) + 'px';
            tile.style.top = (y * this.tileSize) + 'px';

            field.appendChild(tile);
        }
    }

    // Затем отрисовываем предметы поверх карты
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        var itemTile = document.createElement('div');
        itemTile.className = 'tile tile' + item.type;
        itemTile.style.left = (item.x * this.tileSize) + 'px';
        itemTile.style.top = (item.y * this.tileSize) + 'px';
        field.appendChild(itemTile);
    }

    // Отрисовываем врагов
    for (var i = 0; i < this.enemies.length; i++) {
        var enemy = this.enemies[i];
        var enemyTile = document.createElement('div');
        enemyTile.className = 'tile tileE';
        enemyTile.style.left = (enemy.x * this.tileSize) + 'px';
        enemyTile.style.top = (enemy.y * this.tileSize) + 'px';

        // Добавляем здоровье врага
        var healthBar = document.createElement('div');
        healthBar.className = 'health';
        healthBar.style.width = (enemy.health / enemy.maxHealth * 100) + '%';
        enemyTile.appendChild(healthBar);

        field.appendChild(enemyTile);
    }

    // Отрисовываем игрока поверх всего
    var playerTile = document.createElement('div');
    playerTile.className = 'tile tileP';
    playerTile.style.left = (this.player.x * this.tileSize) + 'px';
    playerTile.style.top = (this.player.y * this.tileSize) + 'px';

    // Добавляем здоровье игрока
    var healthBar = document.createElement('div');
    healthBar.className = 'health';
    healthBar.style.width = (this.player.health / this.player.maxHealth * 100) + '%';
    playerTile.appendChild(healthBar);

    field.appendChild(playerTile);

    this.updateGameInfo();
};

// Привязка обработчиков событий
Game.prototype.bindEvents = function() {
    this.boundHandleInput = this.handleInput.bind(this);
    document.addEventListener('keydown', this.boundHandleInput);
};

// Движение врагов
Game.prototype.moveEnemies = function() {
    for (var i = 0; i < this.enemies.length; i++) {
        var enemy = this.enemies[i];

        // Сначала проверяем, может ли враг атаковать игрока
        if (this.canEnemyAttackPlayer(enemy)) {
            this.enemyAttackPlayer(enemy);
            continue;
        }

        // Вычисляем расстояние до игрока
        var distance = this.getDistance(enemy.x, enemy.y, this.player.x, this.player.y);

        // Если игрок близко, преследуем его
        if (distance <= 10) { // Дистанция преследования - 10 клеток
            this.moveEnemySmartly(enemy);
        } else {
            // Если игрок далеко, двигаемся случайно или остаемся на месте
            if (Math.random() < 0.3) { // 30% шанс сделать шаг
                this.moveEnemyRandomly(enemy);
            }
            // 70% шанс остаться на месте (отдых)
        }
    }
};

// Вычисление расстояния между двумя точками
Game.prototype.getDistance = function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

// Интеллектуальное движение врага к игроку
Game.prototype.moveEnemySmartly = function(enemy) {
    // Если игрок в пределах досягаемости для атаки, не двигаемся
    if (this.canEnemyAttackPlayer(enemy)) {
        return;
    }

    // Используем волновой алгоритм для поиска пути к игроку
    var path = this.findPath(enemy.x, enemy.y, this.player.x, this.player.y);

    if (path && path.length > 1) {
        // Берем первую клетку пути (следующий шаг)
        var nextStep = path[1];

        // Проверяем, можно ли переместиться на эту клетку
        if (this.canEnemyMoveTo(nextStep.x, nextStep.y)) {
            this.performEnemyMove(enemy, nextStep.x, nextStep.y);
        }
    } else {
        // Если путь не найден, двигаемся случайно
        this.moveEnemyRandomly(enemy);
    }
};

// Волновой алгоритм для поиска пути
Game.prototype.findPath = function(startX, startY, targetX, targetY) {
    // Если целевая клетка недостижима (стена или занята), возвращаем null
    if (this.map[targetY][targetX] === TILE_TYPES.WALL) {
        return null;
    }

    // Создаем карту расстояний
    var distMap = [];
    for (var y = 0; y < this.mapHeight; y++) {
        distMap[y] = [];
        for (var x = 0; x < this.mapWidth; x++) {
            distMap[y][x] = -1; // -1 означает непосещенную клетку
        }
    }

    // Очередь для обхода в ширину
    var queue = [{x: startX, y: startY}];
    distMap[startY][startX] = 0;

    // Направления движения (вверх, вниз, влево, вправо)
    var directions = [
        {dx: 0, dy: -1},
        {dx: 0, dy: 1},
        {dx: -1, dy: 0},
        {dx: 1, dy: 0}
    ];

    // Обход в ширину
    while (queue.length > 0) {
        var current = queue.shift();

        // Если достигли цели, строим путь назад
        if (current.x === targetX && current.y === targetY) {
            return this.buildPath(distMap, startX, startY, targetX, targetY);
        }

        // Проверяем соседние клетки
        for (var i = 0; i < directions.length; i++) {
            var newX = current.x + directions[i].dx;
            var newY = current.y + directions[i].dy;

            // Проверяем границы и проходимость клетки
            if (newX >= 0 && newX < this.mapWidth &&
                newY >= 0 && newY < this.mapHeight &&
                distMap[newY][newX] === -1 && // Не посещали
                this.map[newY][newX] !== TILE_TYPES.WALL && // Не стена
                this.map[newY][newX] !== TILE_TYPES.ENEMY) { // Не занята врагом

                distMap[newY][newX] = distMap[current.y][current.x] + 1;
                queue.push({x: newX, y: newY});
            }
        }
    }

    // Путь не найден
    return null;
};

// Восстановление пути от цели к старту
Game.prototype.buildPath = function(distMap, startX, startY, targetX, targetY) {
    var path = [];
    var currentX = targetX;
    var currentY = targetY;

    // Начинаем с целевой клетки
    path.unshift({x: currentX, y: currentY});

    // Пока не дойдем до старта
    while (currentX !== startX || currentY !== startY) {
        var directions = [
            {dx: 0, dy: -1},
            {dx: 0, dy: 1},
            {dx: -1, dy: 0},
            {dx: 1, dy: 0}
        ];

        var found = false;

        // Ищем клетку с меньшим расстоянием
        for (var i = 0; i < directions.length; i++) {
            var newX = currentX + directions[i].dx;
            var newY = currentY + directions[i].dy;

            if (newX >= 0 && newX < this.mapWidth &&
                newY >= 0 && newY < this.mapHeight &&
                distMap[newY][newX] >= 0 && // Посещенная клетка
                distMap[newY][newX] === distMap[currentY][currentX] - 1) {

                currentX = newX;
                currentY = newY;
                path.unshift({x: currentX, y: currentY});
                found = true;
                break;
            }
        }

        if (!found) {
            // Не удалось построить путь
            return null;
        }
    }

    return path;
};

// Проверка возможности перемещения врага
Game.prototype.canEnemyMoveTo = function(x, y) {
    // Проверяем границы карты
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
        return false;
    }

    // Проверяем, что клетка не является стеной и не занята другим врагом
    if (this.map[y][x] === TILE_TYPES.WALL || this.map[y][x] === TILE_TYPES.ENEMY) {
        return false;
    }

    // Проверяем, что клетка не занята игроком (враг атакует, а не занимает клетку игрока)
    if (this.map[y][x] === TILE_TYPES.PLAYER) {
        return false;
    }

    return true;
};

// Выполнение перемещения врага
Game.prototype.performEnemyMove = function(enemy, newX, newY) {
    // Освобождаем старую клетку
    this.map[enemy.y][enemy.x] = TILE_TYPES.FLOOR;

    // Если на новой клетке был предмет, удаляем его
    //this.removeItemAt(newX, newY);

    // Обновляем позицию врага
    enemy.x = newX;
    enemy.y = newY;
    this.map[enemy.y][enemy.x] = TILE_TYPES.ENEMY;
};

// Удаление предмета с карты
Game.prototype.removeItemAt = function(x, y) {
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        if (item.x === x && item.y === y) {
            this.items.splice(i, 1);
            break;
        }
    }
};

// Проверка возможности атаки игрока
Game.prototype.canEnemyAttackPlayer = function(enemy) {
    var distanceX = Math.abs(enemy.x - this.player.x);
    var distanceY = Math.abs(enemy.y - this.player.y);

    // Игрок находится на соседней клетке (включая диагонали)
    return distanceX <= 1 && distanceY <= 1;
};

// Случайное движение врага
Game.prototype.moveEnemyRandomly = function(enemy) {
    var directions = [
        {dx: 0, dy: -1},  // Вверх
        {dx: 0, dy: 1},   // Вниз
        {dx: -1, dy: 0},  // Влево
        {dx: 1, dy: 0}    // Вправо
    ];

    // Перемешиваем направления для более случайного движения
    this.shuffleArray(directions);

    // Пытаемся двигаться в одном из направлений
    for (var j = 0; j < directions.length; j++) {
        var newX = enemy.x + directions[j].dx;
        var newY = enemy.y + directions[j].dy;

        // Проверяем, можно ли переместиться
        if (this.canEnemyMoveTo(newX, newY)) {
            // Обновляем позицию врага
            this.map[enemy.y][enemy.x] = TILE_TYPES.FLOOR;
            enemy.x = newX;
            enemy.y = newY;
            this.map[enemy.y][enemy.x] = TILE_TYPES.ENEMY;
            break;
        }
    }
};

// Обработка ввода
Game.prototype.handleInput = function(event) {
    // Если игра окончена, игнорируем ввод
    if (this.player.health <= 0 || this.enemies.length === 0) {
        return;
    }

    var newX = this.player.x;
    var newY = this.player.y;

    switch (event.key.toLowerCase()) {
        case 'w': // Вверх
            newY--;
            break;
        case 's': // Вниз
            newY++;
            break;
        case 'a': // Влево
            newX--;
            break;
        case 'd': // Вправо
            newX++;
            break;
        case ' ': // Пробел - атака
            event.preventDefault();
            this.attack();
            this.checkGameState(); // Проверяем состояние после атаки
            return;
        default:
            return;
    }

    if (this.canMoveTo(newX, newY)) {
        this.checkItems(newX, newY);

        this.map[this.player.y][this.player.x] = TILE_TYPES.FLOOR;
        this.player.x = newX;
        this.player.y = newY;
        this.map[this.player.y][this.player.x] = TILE_TYPES.PLAYER;

        this.moveEnemies();
        this.checkGameState(); // Проверяем состояние после хода

        this.render();
    }

    if (event.key === ' ') {
        event.preventDefault();
    }
};

// Атака игрока (пробел)
Game.prototype.attack = function() {
    var attacked = false;

    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            var targetX = this.player.x + dx;
            var targetY = this.player.y + dy;

            for (var i = 0; i < this.enemies.length; i++) {
                var enemy = this.enemies[i];
                if (enemy.x === targetX && enemy.y === targetY) {
                    enemy.health -= this.player.attackPower;
                    console.log('Игрок атаковал врага! Урон: ' + this.player.attackPower);
                    attacked = true;

                    if (enemy.health <= 0) {
                        console.log('Враг побежден!');
                        this.enemies.splice(i, 1);
                        this.map[enemy.y][enemy.x] = TILE_TYPES.FLOOR;
                        i--;
                    }
                    break;
                }
            }
        }
    }

    if (!attacked) {
        console.log('Нет врагов в радиусе атаки!');
    }

    this.render();

    this.updateGameInfo();
};

// Атака врагом игрока
Game.prototype.enemyAttackPlayer = function(enemy) {
    var damage = 5;
    this.player.health -= damage;
    console.log('Враг атаковал игрока! Урон: ' + damage + '. Здоровье игрока: ' + this.player.health);

    // Проверяем состояние игры после атаки
    this.checkGameState();
};

// Проверка возможности перемещения
Game.prototype.canMoveTo = function(x, y) {
    // Проверяем границы карты
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
        return false;
    }

    // Проверяем, что клетка не является стеной
    return (this.map[y][x] !== TILE_TYPES.WALL && this.map[y][x] !== TILE_TYPES.ENEMY);
};

// Проверка предметов на клетке
Game.prototype.checkItems = function(x, y) {
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        if (item.x === x && item.y === y) {
            if (item.type === TILE_TYPES.HEALTH_POTION) {
                // Восстанавливаем здоровье
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
                console.log('Подобрано зелье здоровья! Здоровье: ' + this.player.health);
            } else if (item.type === TILE_TYPES.SWORD) {
                // Увеличиваем силу атаки
                this.player.attackPower += 5;
                console.log('Подобран меч! Сила атаки: ' + this.player.attackPower);
            }

            // Удаляем предмет
            this.items.splice(i, 1);

            this.updateGameInfo();

            break;
        }
    }
};

// Конец игры
Game.prototype.gameOver = function(isWin) {
    // Убираем обработчик событий
    document.removeEventListener('keydown', this.boundHandleInput);

    // Показываем сообщение
    var message = isWin ? 'ПОБЕДА! Все враги побеждены!' : 'ПОРАЖЕНИЕ! Игрок погиб!';
    alert(message);

    // Перезапускаем игру через 3 секунды
    console.log('Перезапуск игры через 3 секунды...');
    setTimeout(function() {
        location.reload();
    }, 3000);
};

// Проверка условий после каждого хода
Game.prototype.checkGameState = function() {
    // Проверяем, умер ли игрок
    if (this.player.health <= 0) {
        this.gameOver(false);
        return;
    }

    // Проверяем, остались ли враги
    if (this.enemies.length === 0) {
        this.gameOver(true);
        return;
    }
};

// Инициализация игры
Game.prototype.init = function() {
    this.generateMap();
    this.render();
    this.bindEvents();

    this.updateGameInfo();
};
