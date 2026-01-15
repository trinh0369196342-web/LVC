// ====================
// GAME CONSTANTS
// ====================
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const SNAKE_RADIUS = 15;
const FOOD_RADIUS = 12;
const OBSTACLE_SIZE = 50;
const MINIMAP_SCALE = 0.05;

// Map regions
const REGIONS = {
    forest: {
        name: 'Rừng',
        color: '#2d5016',
        foodColor: '#2ecc71',
        foodDensity: 0.7,
        obstacles: 5
    },
    desert: {
        name: 'Sa mạc',
        color: '#c2b280',
        foodColor: '#f1c40f',
        foodDensity: 0.4,
        obstacles: 3
    },
    water: {
        name: 'Biển',
        color: '#1e90ff',
        foodColor: '#3498db',
        foodDensity: 0.2,
        obstacles: 2
    },
    mountain: {
        name: 'Núi',
        color: '#8b4513',
        foodColor: '#e74c3c',
        foodDensity: 0.6,
        obstacles: 8
    }
};

// ====================
// GLOBAL VARIABLES
// ====================
let snake = [];
let foods = [];
let obstacles = [];
let gameInterval;
let gameSpeed = 7;
let score = 0;
let snakeLength = 1;
let gameTime = 0;
let gameActive = false;
let gamePaused = false;
let isBoostActive = false;
let boostCount = 3;
let boostCooldown = 0;

// Position and viewport
let playerX = MAP_WIDTH / 2;
let playerY = MAP_HEIGHT / 2;
let direction = 0;
let viewportX = 0;
let viewportY = 0;

// Snake customization
let snakeColors = {
    primary: '#00adb5',
    secondary: '#34495e',
    pattern: 'solid',
    glow: '#00ff88',
    eyes: '#ffffff'
};

// Joystick
let joystickActive = false;
let joystickAngle = 0;
let joystickDistance = 0;

// User data
let currentUser = null;
let userProfile = {
    id: 'guest',
    username: 'Khách',
    high_score: 0,
    total_food: 0,
    games_played: 0,
    total_score: 0
};

// Stats
let highScore = 0;
let totalFood = 0;
let gamesPlayed = 0;
let totalScore = 0;

// Canvas contexts
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// ====================
// AUTHENTICATION (SIMULATED)
// ====================
function initializeAuth() {
    // Try to load saved user data
    loadUserData();
    
    // Show auth modal
    showAuthModal();
    
    // Update UI with loaded data
    updateUserUI();
    updateStats();
}

function loadUserData() {
    try {
        const savedData = localStorage.getItem('snakeUniverseData');
        if (savedData) {
            const data = JSON.parse(savedData);
            userProfile = data.userProfile || userProfile;
            highScore = data.highScore || 0;
            totalFood = data.totalFood || 0;
            gamesPlayed = data.gamesPlayed || 0;
            totalScore = data.totalScore || 0;
            
            // Load snake customization
            if (data.snakeColors) {
                snakeColors = data.snakeColors;
                updateCustomizationUI();
            }
            
            showNotification('Đã tải dữ liệu đã lưu', 'success');
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
    }
}

function saveUserData() {
    try {
        const data = {
            userProfile,
            highScore,
            totalFood,
            gamesPlayed,
            totalScore,
            snakeColors,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('snakeUniverseData', JSON.stringify(data));
    } catch (error) {
        console.error('Lỗi khi lưu dữ liệu:', error);
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Vui lòng nhập tên đăng nhập và mật khẩu', 'warning');
        return;
    }
    
    // Simulated login for demo
    userProfile.username = username;
    userProfile.id = 'user-' + Date.now();
    
    showNotification(`Chào mừng ${username}! (Chế độ demo)`, 'success');
    showGame();
    saveUserData();
}

function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;
    
    if (!username || !password) {
        showNotification('Vui lòng nhập đầy đủ thông tin', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Mật khẩu không khớp', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Tên đăng nhập phải có ít nhất 3 ký tự', 'warning');
        return;
    }
    
    // Simulated registration for demo
    userProfile.username = username;
    userProfile.id = 'user-' + Date.now();
    userProfile.high_score = 0;
    userProfile.total_food = 0;
    userProfile.games_played = 0;
    
    showNotification(`Đăng ký thành công! Chào mừng ${username}`, 'success');
    switchToLogin();
    saveUserData();
}

function playAsGuest() {
    userProfile = {
        id: 'guest-' + Date.now(),
        username: 'Khách',
        high_score: highScore,
        total_food: totalFood,
        games_played: gamesPlayed,
        total_score: totalScore
    };
    
    showNotification('Đang chơi với tư cách khách. Dữ liệu được lưu trên trình duyệt.', 'info');
    showGame();
}

function handleLogout() {
    if (confirm('Bạn có muốn đăng xuất không?')) {
        saveUserData();
        location.reload();
    }
}

// ====================
// GAME INITIALIZATION
// ====================
function initializeGame() {
    // Set canvas size
    canvas.width = VIEWPORT_WIDTH;
    canvas.height = VIEWPORT_HEIGHT;
    minimapCanvas.width = 280;
    minimapCanvas.height = 150;
    
    // Initialize game state
    resetGame();
    
    // Generate initial map
    generateObstacles();
    generateFoods(50);
    
    // Start rendering
    requestAnimationFrame(gameLoop);
}

function resetGame() {
    snake = [];
    score = 0;
    snakeLength = 1;
    gameTime = 0;
    gameActive = false;
    gamePaused = false;
    isBoostActive = false;
    boostCount = 3;
    boostCooldown = 0;
    
    // Reset player position
    playerX = MAP_WIDTH / 2;
    playerY = MAP_HEIGHT / 2;
    direction = 0;
    
    // Create snake head
    snake.push({
        x: playerX,
        y: playerY,
        radius: SNAKE_RADIUS
    });
    
    // Update viewport
    viewportX = playerX - VIEWPORT_WIDTH / 2;
    viewportY = playerY - VIEWPORT_HEIGHT / 2;
    
    // Update UI
    updateUI();
    updateMinimap();
    
    // Show start screen
    document.getElementById('gameStartScreen').style.display = 'flex';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('pauseScreen').classList.remove('active');
}

function startGame() {
    if (gameActive) return;
    
    gameActive = true;
    gamePaused = false;
    document.getElementById('gameStartScreen').style.display = 'none';
    
    // Start game timer
    startTimer();
    
    // Start game loop
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
    
    // Increment games played
    gamesPlayed++;
    updateStats();
}

function pauseGame() {
    if (!gameActive) return;
    
    gamePaused = !gamePaused;
    document.getElementById('pauseScreen').classList.toggle('active', gamePaused);
    
    if (gamePaused) {
        clearInterval(gameInterval);
    } else {
        gameInterval = setInterval(updateGame, 1000 / 60);
    }
}

function gameOver() {
    gameActive = false;
    clearInterval(gameInterval);
    
    // Update final stats
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLength').textContent = snakeLength;
    document.getElementById('finalTime').textContent = formatTime(gameTime);
    
    // Show game over screen
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    // Update stats
    updateStats();
    
    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        userProfile.high_score = highScore;
        showNotification(`Kỷ lục mới: ${score} điểm!`, 'success');
        updateStats();
    }
    
    // Save data
    saveUserData();
}

// ====================
// GAME LOGIC
// ====================
function updateGame() {
    if (gamePaused || !gameActive) return;
    
    // Update direction from joystick
    if (joystickActive && joystickDistance > 0.1) {
        direction = joystickAngle;
    }
    
    // Calculate movement
    let speed = isBoostActive ? gameSpeed * 1.8 : gameSpeed;
    let moveX = Math.cos(direction) * speed;
    let moveY = Math.sin(direction) * speed;
    
    // Update player position
    playerX += moveX;
    playerY += moveY;
    
    // Wrap around map edges
    if (playerX < 0) playerX = MAP_WIDTH;
    if (playerX > MAP_WIDTH) playerX = 0;
    if (playerY < 0) playerY = MAP_HEIGHT;
    if (playerY > MAP_HEIGHT) playerY = 0;
    
    // Update snake head
    snake[0].x = playerX;
    snake[0].y = playerY;
    
    // Update viewport
    viewportX = playerX - VIEWPORT_WIDTH / 2;
    viewportY = playerY - VIEWPORT_HEIGHT / 2;
    
    // Clamp viewport to map
    viewportX = Math.max(0, Math.min(viewportX, MAP_WIDTH - VIEWPORT_WIDTH));
    viewportY = Math.max(0, Math.min(viewportY, MAP_HEIGHT - VIEWPORT_HEIGHT));
    
    // Check collisions
    checkFoodCollisions();
    checkObstacleCollisions();
    checkSelfCollision();
    
    // Update snake length
    updateSnakeLength();
    
    // Update UI
    updateUI();
    updateMinimap();
    
    // Update region info
    updateRegionInfo();
}

function checkFoodCollisions() {
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        const dx = playerX - food.x;
        const dy = playerY - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < SNAKE_RADIUS + FOOD_RADIUS) {
            // Eat food
            score += food.value || 10;
            snakeLength += food.growth || 1;
            totalFood++;
            userProfile.total_food = totalFood;
            
            // Remove food
            foods.splice(i, 1);
            
            // Generate new food
            generateFoods(1);
            
            // Show notification for special food
            if (food.special) {
                showNotification(`Ăn được thức ăn đặc biệt! +${food.value} điểm`, 'success');
            }
            
            // Update stats
            updateStats();
        }
    }
}

function checkObstacleCollisions() {
    for (const obstacle of obstacles) {
        if (playerX + SNAKE_RADIUS > obstacle.x &&
            playerX - SNAKE_RADIUS < obstacle.x + obstacle.width &&
            playerY + SNAKE_RADIUS > obstacle.y &&
            playerY - SNAKE_RADIUS < obstacle.y + obstacle.height) {
            gameOver();
            return;
        }
    }
}

function checkSelfCollision() {
    if (snake.length < 8) return;
    
    for (let i = 5; i < snake.length; i++) {
        const segment = snake[i];
        const dx = playerX - segment.x;
        const dy = playerY - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < SNAKE_RADIUS * 1.5) {
            gameOver();
            return;
        }
    }
}

function updateSnakeLength() {
    // Add new segments if needed
    while (snake.length < snakeLength) {
        const lastSegment = snake[snake.length - 1] || snake[0];
        snake.push({
            x: lastSegment.x,
            y: lastSegment.y,
            radius: SNAKE_RADIUS
        });
    }
    
    // Remove excess segments
    while (snake.length > snakeLength) {
        snake.pop();
    }
    
    // Update segment positions
    const segmentDistance = SNAKE_RADIUS * 1.8;
    
    for (let i = snake.length - 1; i > 0; i--) {
        const targetX = snake[i - 1].x;
        const targetY = snake[i - 1].y;
        const dx = targetX - snake[i].x;
        const dy = targetY - snake[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > segmentDistance) {
            const angle = Math.atan2(dy, dx);
            snake[i].x += Math.cos(angle) * (distance - segmentDistance);
            snake[i].y += Math.sin(angle) * (distance - segmentDistance);
        }
    }
}

// ====================
// MAP GENERATION
// ====================
function generateObstacles() {
    obstacles = [];
    
    // Generate obstacles for each region
    Object.keys(REGIONS).forEach(regionType => {
        const region = REGIONS[regionType];
        const regionCount = region.obstacles;
        
        for (let i = 0; i < regionCount * 10; i++) {
            // Distribute obstacles across the map
            const regionX = Math.random() * MAP_WIDTH;
            const regionY = Math.random() * MAP_HEIGHT;
            
            // Check if position is in appropriate region
            if (getRegionAt(regionX, regionY) === regionType) {
                const size = OBSTACLE_SIZE + Math.random() * OBSTACLE_SIZE * 2;
                obstacles.push({
                    x: regionX,
                    y: regionY,
                    width: size,
                    height: size,
                    type: regionType
                });
            }
        }
    });
}

function generateFoods(count) {
    for (let i = 0; i < count; i++) {
        let food;
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            const x = Math.random() * MAP_WIDTH;
            const y = Math.random() * MAP_HEIGHT;
            const regionType = getRegionAt(x, y);
            const region = REGIONS[regionType];
            
            // Random chance based on region density
            if (Math.random() < region.foodDensity) {
                food = {
                    x: x,
                    y: y,
                    radius: FOOD_RADIUS,
                    color: region.foodColor,
                    region: regionType,
                    value: 10,
                    growth: 1
                };
                
                // 10% chance for special food
                if (Math.random() < 0.1) {
                    food.special = true;
                    food.color = '#ff9800';
                    food.value = 50;
                    food.growth = 3;
                    food.radius = FOOD_RADIUS * 1.5;
                }
                
                // Check if too close to other food
                validPosition = true;
                for (const otherFood of foods) {
                    const dx = food.x - otherFood.x;
                    const dy = food.y - otherFood.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 100) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            attempts++;
        }
        
        if (validPosition && food) {
            foods.push(food);
        }
    }
}

function getRegionAt(x, y) {
    // Simple region distribution based on noise
    const nx = x / MAP_WIDTH;
    const ny = y / MAP_HEIGHT;
    
    // Generate pseudo-random value
    const value = (Math.sin(nx * 10) + Math.cos(ny * 10) + 2) / 4;
    
    if (value < 0.25) return 'water';
    if (value < 0.5) return 'desert';
    if (value < 0.75) return 'forest';
    return 'mountain';
}

// ====================
// RENDERING
// ====================
function gameLoop() {
    renderGame();
    requestAnimationFrame(gameLoop);
}

function renderGame() {
    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid();
    
    // Draw obstacles
    drawObstacles();
    
    // Draw foods
    drawFoods();
    
    // Draw snake
    drawSnake();
    
    // Draw player direction
    drawDirectionIndicator();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 173, 181, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = Math.floor(viewportX / gridSize) * gridSize - viewportX;
    const startY = Math.floor(viewportY / gridSize) * gridSize - viewportY;
    
    // Vertical lines
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        const screenX = obstacle.x - viewportX;
        const screenY = obstacle.y - viewportY;
        
        // Check if in viewport
        if (screenX + obstacle.width > 0 && screenX < canvas.width &&
            screenY + obstacle.height > 0 && screenY < canvas.height) {
            
            ctx.fillStyle = REGIONS[obstacle.type].color;
            ctx.fillRect(screenX, screenY, obstacle.width, obstacle.height);
            
            // Border
            ctx.strokeStyle = '#222831';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, obstacle.width, obstacle.height);
        }
    });
}

function drawFoods() {
    foods.forEach(food => {
        const screenX = food.x - viewportX;
        const screenY = food.y - viewportY;
        
        // Check if in viewport
        if (screenX + food.radius > 0 && screenX - food.radius < canvas.width &&
            screenY + food.radius > 0 && screenY - food.radius < canvas.height) {
            
            // Food body
            ctx.fillStyle = food.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, food.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(screenX - food.radius * 0.3, screenY - food.radius * 0.3,
                   food.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Special food effect
            if (food.special) {
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, food.radius + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    });
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const screenX = segment.x - viewportX;
        const screenY = segment.y - viewportY;
        
        // Calculate color based on position
        let color;
        if (index === 0) {
            color = snakeColors.primary; // Head
        } else {
            // Gradient from primary to secondary
            const ratio = index / snake.length;
            color = interpolateColor(snakeColors.primary, snakeColors.secondary, ratio);
        }
        
        // Apply boost effect
        if (isBoostActive) {
            color = interpolateColor(color, '#ff9800', 0.5);
        }
        
        // Draw segment
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, segment.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pattern
        if (snakeColors.pattern !== 'solid') {
            drawSnakePattern(screenX, screenY, segment.radius, index);
        }
        
        // Draw head details
        if (index === 0) {
            // Eyes
            const eyeRadius = segment.radius * 0.3;
            const eyeOffset = segment.radius * 0.6;
            const eyeX = screenX + Math.cos(direction) * eyeOffset;
            const eyeY = screenY + Math.sin(direction) * eyeOffset;
            
            ctx.fillStyle = snakeColors.eyes;
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupil
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow effect for boost
            if (isBoostActive) {
                ctx.shadowColor = '#ff9800';
                ctx.shadowBlur = 20;
                setTimeout(() => ctx.shadowBlur = 0, 100);
            }
        }
    });
}

function drawSnakePattern(x, y, radius, index) {
    ctx.strokeStyle = snakeColors.pattern === 'striped' ? snakeColors.secondary : '#fff';
    ctx.lineWidth = 2;
    
    switch (snakeColors.pattern) {
        case 'striped':
            ctx.beginPath();
            ctx.arc(x, y, radius, index * 0.5, index * 0.5 + 0.5);
            ctx.stroke();
            break;
        case 'spotted':
            if (index % 3 === 0) {
                ctx.fillStyle = snakeColors.secondary;
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'gradient':
            // Already handled by color interpolation
            break;
    }
}

function drawDirectionIndicator() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = 'rgba(0, 173, 181, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#00adb5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(direction) * 30,
        centerY + Math.sin(direction) * 30
    );
    ctx.stroke();
}

function updateMinimap() {
    const width = minimapCanvas.width;
    const height = minimapCanvas.height;
    
    // Clear minimap
    minimapCtx.fillStyle = '#0a1929';
    minimapCtx.fillRect(0, 0, width, height);
    
    // Calculate scale
    const scale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
    
    // Draw regions
    const regionSize = 100;
    for (let x = 0; x < MAP_WIDTH; x += regionSize) {
        for (let y = 0; y < MAP_HEIGHT; y += regionSize) {
            const region = getRegionAt(x + regionSize / 2, y + regionSize / 2);
            minimapCtx.fillStyle = REGIONS[region].color + '80'; // 50% opacity
            minimapCtx.fillRect(x * scale, y * scale, regionSize * scale, regionSize * scale);
        }
    }
    
    // Draw obstacles
    minimapCtx.fillStyle = '#222831';
    obstacles.forEach(obstacle => {
        minimapCtx.fillRect(
            obstacle.x * scale,
            obstacle.y * scale,
            obstacle.width * scale,
            obstacle.height * scale
        );
    });
    
    // Draw foods
    foods.forEach(food => {
        minimapCtx.fillStyle = food.color;
        minimapCtx.beginPath();
        minimapCtx.arc(
            food.x * scale,
            food.y * scale,
            FOOD_RADIUS * scale * 2,
            0, Math.PI * 2
        );
        minimapCtx.fill();
    });
    
    // Draw snake
    snake.forEach((segment, index) => {
        const color = index === 0 ? '#00ff88' : '#00adb5';
        minimapCtx.fillStyle = color;
        minimapCtx.beginPath();
        minimapCtx.arc(
            segment.x * scale,
            segment.y * scale,
            SNAKE_RADIUS * scale * (index === 0 ? 3 : 2),
            0, Math.PI * 2
        );
        minimapCtx.fill();
    });
    
    // Draw viewport rectangle
    minimapCtx.strokeStyle = '#00ff88';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(
        viewportX * scale,
        viewportY * scale,
        VIEWPORT_WIDTH * scale,
        VIEWPORT_HEIGHT * scale
    );
}

// ====================
// JOYSTICK CONTROLS
// ====================
function initializeJoystick() {
    const joystick = document.getElementById('joystick');
    const handle = document.getElementById('joystickHandle');
    
    let isDragging = false;
    let startX, startY;
    let joystickRadius = 90;
    
    joystick.addEventListener('mousedown', startDrag);
    joystick.addEventListener('touchstart', startDrag);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
        if (!gameActive || gamePaused) return;
        
        isDragging = true;
        joystickActive = true;
        
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }
        
        updateJoystick(startX, startY, centerX, centerY);
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        updateJoystick(clientX, clientY, centerX, centerY);
    }
    
    function endDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        joystickActive = false;
        joystickDistance = 0;
        
        // Reset handle position
        handle.style.transform = 'translate(-50%, -50%)';
    }
    
    function updateJoystick(clientX, clientY, centerX, centerY) {
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit to joystick radius
        joystickDistance = Math.min(distance / joystickRadius, 1);
        joystickAngle = Math.atan2(dy, dx);
        
        const limitedX = Math.cos(joystickAngle) * joystickDistance * joystickRadius;
        const limitedY = Math.sin(joystickAngle) * joystickDistance * joystickRadius;
        
        // Update handle position
        handle.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
    }
}

// ====================
// BOOST SYSTEM
// ====================
function activateBoost() {
    if (boostCount <= 0 || boostCooldown > 0 || isBoostActive || !gameActive) {
        return;
    }
    
    boostCount--;
    isBoostActive = true;
    
    // Update UI
    updateBoostUI();
    
    // Boost effect
    const boostDuration = 3000; // 3 seconds
    const originalSpeed = gameSpeed;
    gameSpeed *= 1.8;
    
    // Reset after duration
    setTimeout(() => {
        isBoostActive = false;
        gameSpeed = originalSpeed;
        
        // Start cooldown
        boostCooldown = 10000; // 10 seconds
        const cooldownInterval = setInterval(() => {
            boostCooldown -= 100;
            updateBoostUI();
            
            if (boostCooldown <= 0) {
                clearInterval(cooldownInterval);
                boostCooldown = 0;
                
                // Regenerate boost if not at max
                if (boostCount < 3) {
                    boostCount++;
                    updateBoostUI();
                }
            }
        }, 100);
    }, boostDuration);
}

function updateBoostUI() {
    document.getElementById('boostCount').textContent = boostCount;
    document.getElementById('boostCountDisplay').textContent = `${boostCount}/3`;
    
    const cooldownBar = document.getElementById('cooldownBar');
    const boostBtn = document.getElementById('boostBtn');
    
    if (boostCooldown > 0) {
        const percent = ((10000 - boostCooldown) / 10000) * 100;
        cooldownBar.style.width = `${percent}%`;
        boostBtn.classList.add('disabled');
    } else {
        cooldownBar.style.width = '100%';
        boostBtn.classList.remove('disabled');
    }
    
    if (isBoostActive) {
        boostBtn.style.background = 'linear-gradient(135deg, #4caf50, #388e3c)';
    } else if (boostCount > 0) {
        boostBtn.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
    } else {
        boostBtn.style.background = 'linear-gradient(135deg, #757575, #616161)';
    }
}

// ====================
// KEYBOARD CONTROLS
// ====================
function initializeKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        
        switch (e.key) {
            case 'ArrowUp':
                direction = -Math.PI / 2;
                break;
            case 'ArrowDown':
                direction = Math.PI / 2;
                break;
            case 'ArrowLeft':
                direction = Math.PI;
                break;
            case 'ArrowRight':
                direction = 0;
                break;
            case ' ':
                e.preventDefault();
                if (gameActive) {
                    pauseGame();
                } else {
                    startGame();
                }
                break;
            case 'r':
            case 'R':
                if (!gameActive) resetGame();
                break;
            case 'b':
            case 'B':
                activateBoost();
                break;
            case 'Escape':
                if (gameActive) pauseGame();
                break;
        }
    });
}

// ====================
// UI UPDATES
// ====================
function updateUI() {
    // Update stats
    document.getElementById('currentScore').textContent = score;
    document.getElementById('snakeLength').textContent = snakeLength;
    document.getElementById('playerX').textContent = Math.floor(playerX);
    document.getElementById('playerY').textContent = Math.floor(playerY);
    
    // Update boost
    updateBoostUI();
}

function updateUserUI() {
    document.getElementById('usernameDisplay').textContent = userProfile.username;
    document.getElementById('userHighScore').textContent = userProfile.high_score;
    document.getElementById('userAvatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.username}`;
    document.getElementById('gameMode').textContent = userProfile.id.startsWith('guest') ? 'Khách' : 'Người dùng';
}

function updateStats() {
    // Update sidebar stats
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('totalFood').textContent = totalFood;
    document.getElementById('gamesPlayed').textContent = gamesPlayed;
    
    const avgScore = gamesPlayed > 0 ? Math.floor(totalScore / gamesPlayed) : 0;
    document.getElementById('avgScore').textContent = avgScore;
    
    // Update chat stats
    document.getElementById('chatHighScore').textContent = highScore;
    document.getElementById('chatFoodEaten').textContent = totalFood;
    document.getElementById('chatGamesPlayed').textContent = gamesPlayed;
    
    // Update leaderboard
    document.getElementById('leaderboardScore').textContent = highScore;
    
    // Update user profile
    userProfile.high_score = highScore;
    userProfile.total_food = totalFood;
    userProfile.games_played = gamesPlayed;
    userProfile.total_score = totalScore;
}

function updateRegionInfo() {
    const regionType = getRegionAt(playerX, playerY);
    const region = REGIONS[regionType];
    document.getElementById('currentRegion').textContent = region.name;
    document.getElementById('playerRegion').textContent = region.name;
}

function updateCustomizationUI() {
    // Update color pickers
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.color === snakeColors.primary) {
            option.classList.add('active');
        }
    });
    
    // Update pattern buttons
    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.pattern === snakeColors.pattern) {
            btn.classList.add('active');
        }
    });
}

// ====================
// CUSTOMIZATION
// ====================
function saveSnakeCustomization() {
    snakeColors = {
        primary: document.querySelector('.color-option.active[data-color]')?.dataset.color || '#00adb5',
        secondary: document.querySelectorAll('.color-option[data-color]')[1]?.dataset.color || '#34495e',
        pattern: document.querySelector('.pattern-btn.active')?.dataset.pattern || 'solid',
        glow: '#00ff88',
        eyes: '#ffffff'
    };
    
    saveUserData();
    showNotification('Đã lưu tùy chỉnh rắn!', 'success');
}

function resetStats() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ thống kê? Hành động này không thể hoàn tác.')) {
        highScore = 0;
        totalFood = 0;
        gamesPlayed = 0;
        totalScore = 0;
        
        userProfile.high_score = 0;
        userProfile.total_food = 0;
        userProfile.games_played = 0;
        userProfile.total_score = 0;
        
        updateStats();
        saveUserData();
        showNotification('Đã xóa toàn bộ thống kê', 'success');
    }
}

// ====================
// TIMER
// ====================
function startTimer() {
    gameTime = 0;
    const timer = setInterval(() => {
        if (!gameActive || gamePaused) {
            clearInterval(timer);
            return;
        }
        gameTime++;
        document.getElementById('gameTime').textContent = formatTime(gameTime);
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ====================
// UTILITY FUNCTIONS
// ====================
function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('gameContainer').style.display = 'none';
}

function showGame() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    updateUserUI();
    updateStats();
}

function switchToLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.querySelector('[data-tab="login"]').classList.add('active');
    document.querySelector('[data-tab="register"]').classList.remove('active');
}

function switchToRegister() {
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.querySelector('[data-tab="register"]').classList.add('active');
    document.querySelector('[data-tab="login"]').classList.remove('active');
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showLoading(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    const messageElement = document.getElementById('loadingMessage');
    
    messageElement.textContent = message;
    loadingScreen.style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function interpolateColor(color1, color2, ratio) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ====================
// EVENT LISTENERS
// ====================
document.addEventListener('DOMContentLoaded', () => {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName === 'login') switchToLogin();
            else if (tabName === 'register') switchToRegister();
        });
    });
    
    // Guest button
    document.getElementById('guestBtn').addEventListener('click', playAsGuest);
    
    // Game controls
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeBtn').addEventListener('click', pauseGame);
    document.getElementById('restartBtn').addEventListener('click', resetGame);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    
    // Boost button
    document.getElementById('boostBtn').addEventListener('click', activateBoost);
    
    // Speed controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameSpeed = parseInt(btn.dataset.speed);
        });
    });
    
    // Color customization
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const group = option.closest('.customization-group');
            const label = group?.querySelector('label')?.textContent;
            
            // Remove active from all options in this group
            group?.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Add active to clicked option
            option.classList.add('active');
            
            // Update snake colors
            if (label?.includes('chính')) {
                snakeColors.primary = option.dataset.color;
            } else if (label?.includes('phụ')) {
                snakeColors.secondary = option.dataset.color;
            }
        });
    });
    
    // Pattern customization
    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            snakeColors.pattern = btn.dataset.pattern;
        });
    });
    
    // Save customization
    document.getElementById('saveCustomization').addEventListener('click', saveSnakeCustomization);
    
    // Reset stats
    document.getElementById('resetStatsBtn').addEventListener('click', resetStats);
    
    // Chat tabs
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.chat-messages').forEach(m => m.classList.remove('active'));
            document.getElementById(tabName + 'Chat').classList.add('active');
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebarLeft');
        sidebar.classList.toggle('collapsed');
    });
    
    // Settings toggles
    document.getElementById('soundToggle').addEventListener('change', function() {
        showNotification(this.checked ? 'Âm thanh đã bật' : 'Âm thanh đã tắt', 'info');
    });
    
    document.getElementById('musicToggle').addEventListener('change', function() {
        showNotification(this.checked ? 'Nhạc nền đã bật' : 'Nhạc nền đã tắt', 'info');
    });
    
    document.getElementById('effectsToggle').addEventListener('change', function() {
        showNotification(this.checked ? 'Hiệu ứng đã bật' : 'Hiệu ứng đã tắt', 'info');
    });
    
    // Share button
    document.getElementById('shareScoreBtn').addEventListener('click', () => {
        const shareText = `Tôi vừa đạt được ${score} điểm trong Snake Universe! Bạn có thể chơi thử tại: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Snake Universe',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText);
            showNotification('Đã sao chép link chia sẻ vào clipboard!', 'success');
        }
    });
    
    // Initialize systems
    initializeAuth();
    initializeGame();
    initializeJoystick();
    initializeKeyboardControls();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('Chào mừng đến với Snake Universe! Chọn "Chơi như khách" để bắt đầu.', 'info');
    }, 1000);
});

// Handle window resize
window.addEventListener('resize', () => {
    // Reinitialize game canvas if needed
    const container = document.querySelector('.game-container');
    if (container) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Update canvas size if significantly changed
        if (Math.abs(canvas.width - width) > 50 || Math.abs(canvas.height - height) > 50) {
            // You can adjust viewport here if you want responsive canvas
        }
    }
});