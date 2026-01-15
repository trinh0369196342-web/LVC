// ====================
// SUPABASE CONFIGURATION
// ====================
// Thay thế bằng thông tin Supabase của bạn
const SUPABASE_URL = 'https://mwjzrkfqbuehwfldjdfr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J2UJCh1_RAJi-RQc73OoLQ_zOT7XvZh';

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let otherPlayers = new Map();
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
let userProfile = null;

// Chat
let chatMessages = [];
let onlineUsers = new Map();
let currentChatTab = 'global';

// Canvas contexts
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// ====================
// AUTHENTICATION
// ====================
async function initializeAuth() {
    // Check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        showGame();
    } else {
        showAuthModal();
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            await loadUserProfile();
            showGame();
            showNotification('Đăng nhập thành công!', 'success');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            showAuthModal();
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading('Đang đăng nhập...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    hideLoading();
    
    if (error) {
        showNotification(error.message, 'error');
        return;
    }
    
    showNotification('Đăng nhập thành công!', 'success');
}

async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;
    
    if (password !== confirmPassword) {
        showNotification('Mật khẩu không khớp!', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Tên người dùng phải có ít nhất 3 ký tự', 'error');
        return;
    }
    
    showLoading('Đang tạo tài khoản...');
    
    // Register user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (authError) {
        hideLoading();
        showNotification(authError.message, 'error');
        return;
    }
    
    // Create profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: authData.user.id,
            email: email,
            username: username,
            high_score: 0,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }]);
    
    if (profileError) {
        hideLoading();
        showNotification(profileError.message, 'error');
        return;
    }
    
    // Create default snake customization
    const { error: customizationError } = await supabase
        .from('snake_customizations')
        .insert([{
            user_id: authData.user.id,
            color_primary: '#00adb5',
            color_secondary: '#34495e',
            pattern: 'solid',
            accessories: {}
        }]);
    
    hideLoading();
    
    if (customizationError) {
        console.error('Customization error:', customizationError);
    }
    
    showNotification('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.', 'success');
    switchToLogin();
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (error) {
        console.error('Error loading profile:', error);
        return;
    }
    
    userProfile = data;
    updateUserUI();
    
    // Load snake customization
    await loadSnakeCustomization();
}

async function loadSnakeCustomization() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('snake_customizations')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    
    if (error) {
        console.error('Error loading customization:', error);
        return;
    }
    
    if (data) {
        snakeColors.primary = data.color_primary || '#00adb5';
        snakeColors.secondary = data.color_secondary || '#34495e';
        snakeColors.pattern = data.pattern || 'solid';
        
        // Update UI
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === snakeColors.primary) {
                option.classList.add('active');
            }
        });
        
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.pattern === snakeColors.pattern) {
                btn.classList.add('active');
            }
        });
    }
}

async function saveSnakeCustomization() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để lưu tùy chỉnh', 'warning');
        return;
    }
    
    const { data, error } = await supabase
        .from('snake_customizations')
        .upsert([{
            user_id: currentUser.id,
            color_primary: snakeColors.primary,
            color_secondary: snakeColors.secondary,
            pattern: snakeColors.pattern,
            updated_at: new Date()
        }]);
    
    if (error) {
        showNotification('Lỗi khi lưu tùy chỉnh', 'error');
        console.error('Error saving customization:', error);
        return;
    }
    
    showNotification('Đã lưu tùy chỉnh rắn!', 'success');
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showNotification('Lỗi khi đăng xuất', 'error');
    }
}

// ====================
// CHAT SYSTEM
// ====================
async function initializeChat() {
    if (!currentUser) return;
    
    // Subscribe to chat messages
    const channel = supabase
        .channel('chat')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => handleNewChatMessage(payload.new)
        )
        .subscribe();
    
    // Load recent messages
    await loadChatMessages();
    
    // Load online users
    await loadOnlineUsers();
    
    // Start online status updates
    updateOnlineStatus();
    setInterval(updateOnlineStatus, 30000); // Update every 30 seconds
}

async function loadChatMessages() {
    const { data, error } = await supabase
        .from('chat_messages')
        .select(`
            *,
            profiles:user_id (
                username,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (error) {
        console.error('Error loading chat:', error);
        return;
    }
    
    chatMessages = data.reverse();
    renderChatMessages();
}

async function handleNewChatMessage(message) {
    chatMessages.push(message);
    if (chatMessages.length > 100) {
        chatMessages.shift();
    }
    
    renderMessage(message);
    
    // Show notification for important messages
    if (message.type === 'system' || message.user_id === currentUser?.id) {
        showNotification(`Tin nhắn mới từ ${message.profiles?.username || 'Hệ thống'}`, 'info');
    }
}

async function sendChatMessage(messageText) {
    if (!currentUser || !messageText.trim()) return;
    
    const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
            user_id: currentUser.id,
            message: messageText,
            type: currentChatTab,
            created_at: new Date()
        }]);
    
    if (error) {
        console.error('Error sending message:', error);
        showNotification('Lỗi khi gửi tin nhắn', 'error');
    }
}

async function loadOnlineUsers() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, high_score, last_seen')
        .order('high_score', { ascending: false })
        .limit(50);
    
    if (error) {
        console.error('Error loading online users:', error);
        return;
    }
    
    onlineUsers.clear();
    data.forEach(user => {
        onlineUsers.set(user.id, user);
    });
    
    renderOnlineUsers();
    updateOnlineCount();
}

async function updateOnlineStatus() {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date() })
        .eq('id', currentUser.id);
    
    if (error) {
        console.error('Error updating online status:', error);
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
    
    // Record game start
    recordGameStart();
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
    
    // Save game session
    saveGameSession();
    
    // Update high score if needed
    if (score > (userProfile?.high_score || 0)) {
        updateHighScore();
    }
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
            
            // Remove food
            foods.splice(i, 1);
            
            // Generate new food
            generateFoods(1);
            
            // Play sound effect
            playSound('eat');
            
            // Show notification for special food
            if (food.special) {
                showNotification(`Ăn được thức ăn đặc biệt! +${food.value} điểm`, 'success');
            }
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
    
    // Draw other players
    drawOtherPlayers();
    
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

function drawOtherPlayers() {
    // This would draw other players in multiplayer mode
    // For now, it's a placeholder
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
    if (!userProfile) return;
    
    document.getElementById('usernameDisplay').textContent = userProfile.username;
    document.getElementById('userHighScore').textContent = userProfile.high_score || 0;
    document.getElementById('userAvatar').src = userProfile.avatar_url || 
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.username}`;
}

function updateRegionInfo() {
    const regionType = getRegionAt(playerX, playerY);
    const region = REGIONS[regionType];
    document.getElementById('currentRegion').textContent = region.name;
    document.getElementById('playerRegion').textContent = region.name;
}

function updateOnlineCount() {
    document.getElementById('onlineCount').textContent = onlineUsers.size;
    document.getElementById('totalPlayers').textContent = onlineUsers.size;
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
// DATABASE OPERATIONS
// ====================
async function recordGameStart() {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('game_sessions')
        .insert([{
            user_id: currentUser.id,
            start_time: new Date()
        }]);
    
    if (error) {
        console.error('Error recording game start:', error);
    }
}

async function saveGameSession() {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('game_sessions')
        .update({
            score: score,
            snake_length: snakeLength,
            game_time: gameTime,
            end_time: new Date()
        })
        .eq('user_id', currentUser.id)
        .is('end_time', null);
    
    if (error) {
        console.error('Error saving game session:', error);
    }
}

async function updateHighScore() {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ high_score: score })
        .eq('id', currentUser.id);
    
    if (error) {
        console.error('Error updating high score:', error);
        return;
    }
    
    // Update local profile
    if (userProfile) {
        userProfile.high_score = score;
        updateUserUI();
    }
    
    // Show notification
    showNotification(`Kỷ lục mới: ${score} điểm!`, 'success');
}

// ====================
// CHAT UI
// ====================
function renderChatMessages() {
    const container = document.getElementById(currentChatTab + 'Chat');
    if (!container) return;
    
    container.innerHTML = '';
    
    chatMessages
        .filter(msg => msg.type === currentChatTab || (currentChatTab === 'friends' && msg.type === 'private'))
        .forEach(renderMessage);
}

function renderMessage(message) {
    const container = document.getElementById(currentChatTab + 'Chat');
    if (!container) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const time = new Date(message.created_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <img src="${message.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}" 
                 class="message-avatar" alt="Avatar">
            <span class="message-user">${message.profiles?.username || 'Ẩn danh'}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
}

function renderOnlineUsers() {
    const container = document.getElementById('onlineUsers');
    if (!container) return;
    
    container.innerHTML = `
        <div class="user-list-header">
            <i class="fas fa-user-clock"></i> Đang online (${onlineUsers.size})
        </div>
    `;
    
    Array.from(onlineUsers.values())
        .sort((a, b) => (b.high_score || 0) - (a.high_score || 0))
        .forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'online-user';
            userElement.innerHTML = `
                <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}" 
                     class="online-user-avatar" alt="Avatar">
                <span class="online-user-name">${user.username}</span>
                <span class="online-user-score">${user.high_score || 0}</span>
            `;
            container.appendChild(userElement);
        });
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
    notification.textContent = message;
    
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

function playSound(type) {
    // Placeholder for sound effects
    console.log(`Playing sound: ${type}`);
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        option.addEventListener('click', () => {
            const colorType = option.closest('.customization-group').querySelector('label').textContent;
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            if (colorType.includes('chính')) {
                snakeColors.primary = option.dataset.color;
            } else if (colorType.includes('phụ')) {
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
    
    // Chat
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChatTab = tab.dataset.tab;
            document.querySelectorAll('.chat-messages').forEach(m => m.classList.remove('active'));
            document.getElementById(currentChatTab + 'Chat').classList.add('active');
        });
    });
    
    // Send chat message
    document.getElementById('sendChatBtn').addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        if (input.value.trim()) {
            sendChatMessage(input.value.trim());
            input.value = '';
        }
    });
    
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('sendChatBtn').click();
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebarLeft');
        sidebar.classList.toggle('collapsed');
    });
    
    // Initialize systems
    initializeAuth();
    initializeGame();
    initializeJoystick();
    initializeKeyboardControls();
    
    // Initialize chat after auth
    setTimeout(() => {
        if (currentUser) {
            initializeChat();
        }
    }, 1000);
});