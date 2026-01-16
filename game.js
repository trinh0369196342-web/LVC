// ============================================
// CONFIGURATION & INITIALIZATION
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://dcnwcgvczxmnolmlvoer.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CwMmQIGLGE-Akqj0OWBY2Q_PId8FwMj';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game Configuration
const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    miniMapSize: 250,
    mapWidth: 2000,
    mapHeight: 2000,
    playerSpeed: 5,
    boostSpeed: 8,
    boostDuration: 3000, // ms
    foodSpawnRate: 10, // foods per second
    collisionRadius: 10,
    updateRate: 60 // FPS
};

// Game State
let gameState = {
    // User
    userId: null,
    username: 'Anonymous',
    playerId: null,
    teamId: null,
    
    // Game
    sessionId: null,
    isPlaying: false,
    isAlive: false,
    score: 0,
    length: 3,
    
    // Position
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    velocity: { x: 0, y: 0 },
    
    // Graphics
    canvas: null,
    ctx: null,
    miniMapCanvas: null,
    miniMapCtx: null,
    camera: { x: 0, y: 0, zoom: 1 },
    
    // Collections
    players: new Map(), // playerId -> player data
    foods: new Map(), // foodId -> food data
    teams: new Map(), // teamId -> team data
    
    // Input
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    
    // Timing
    lastUpdate: 0,
    lastFoodSpawn: 0,
    boostEndTime: 0,
    
    // UI State
    miniMapZoom: 0.1,
    chatMessages: []
};

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Screens
    loadingOverlay: document.getElementById('loading-overlay'),
    loginScreen: document.getElementById('login-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Login
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginButton: document.getElementById('btn-login'),
    
    // Player Info
    playerName: document.getElementById('player-name'),
    playerInitial: document.getElementById('player-initial'),
    playerLevel: document.getElementById('player-level'),
    playerScore: document.getElementById('player-score'),
    
    // Team
    teamDisplay: document.getElementById('team-display'),
    noTeam: document.getElementById('no-team'),
    teamName: document.getElementById('team-name'),
    teamMembers: document.getElementById('team-members'),
    createTeamBtn: document.getElementById('btn-create-team'),
    joinTeamBtn: document.getElementById('btn-join-team'),
    
    // Game Info
    gamePlayers: document.getElementById('game-players'),
    gameStatus: document.getElementById('game-status'),
    leaveGameBtn: document.getElementById('btn-leave-game'),
    
    // Canvas
    gameCanvas: document.getElementById('game-canvas'),
    miniMap: document.getElementById('mini-map'),
    
    // Game Overlay
    gameOverlay: document.getElementById('game-overlay'),
    finalScore: document.getElementById('final-score'),
    playAgainBtn: document.getElementById('btn-play-again'),
    
    // Controls
    zoomInBtn: document.getElementById('btn-zoom-in'),
    zoomOutBtn: document.getElementById('btn-zoom-out'),
    centerMapBtn: document.getElementById('btn-center-map'),
    
    // Leaderboard
    leaderboard: document.getElementById('leaderboard'),
    
    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatType: document.getElementById('chat-type'),
    sendBtn: document.getElementById('btn-send'),
    
    // Modal
    teamModal: document.getElementById('team-modal'),
    teamNameInput: document.getElementById('team-name-input'),
    teamTagInput: document.getElementById('team-tag-input'),
    teamPrivacy: document.getElementById('team-privacy'),
    teamPasswordGroup: document.getElementById('team-password-group'),
    teamPassword: document.getElementById('team-password'),
    confirmCreateBtn: document.getElementById('btn-confirm-create'),
    cancelCreateBtn: document.getElementById('btn-cancel-create')
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('Initializing game...');
    
    // Setup canvas
    setupCanvas();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing session
    await checkExistingSession();
    
    // Hide loading screen
    setTimeout(() => {
        elements.loadingOverlay.classList.add('hidden');
    }, 1000);
}

function setupCanvas() {
    // Main game canvas
    gameState.canvas = elements.gameCanvas;
    gameState.ctx = gameState.canvas.getContext('2d');
    gameState.canvas.width = GAME_CONFIG.canvasWidth;
    gameState.canvas.height = GAME_CONFIG.canvasHeight;
    
    // Mini map canvas
    gameState.miniMapCanvas = elements.miniMap;
    gameState.miniMapCtx = gameState.miniMapCanvas.getContext('2d');
    gameState.miniMapCanvas.width = GAME_CONFIG.miniMapSize;
    gameState.miniMapCanvas.height = GAME_CONFIG.miniMapSize;
    
    // Set camera to center
    gameState.camera.x = GAME_CONFIG.mapWidth / 2;
    gameState.camera.y = GAME_CONFIG.mapHeight / 2;
}

function setupEventListeners() {
    // Login
    elements.loginButton.addEventListener('click', handleLogin);
    elements.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Team buttons
    elements.createTeamBtn.addEventListener('click', showTeamModal);
    elements.joinTeamBtn.addEventListener('click', handleJoinTeam);
    elements.confirmCreateBtn.addEventListener('click', handleCreateTeam);
    elements.cancelCreateBtn.addEventListener('click', hideTeamModal);
    elements.teamPrivacy.addEventListener('change', togglePasswordField);
    
    // Game buttons
    elements.leaveGameBtn.addEventListener('click', handleLeaveGame);
    elements.playAgainBtn.addEventListener('click', handlePlayAgain);
    
    // Mini map controls
    elements.zoomInBtn.addEventListener('click', () => adjustMiniMapZoom(0.1));
    elements.zoomOutBtn.addEventListener('click', () => adjustMiniMapZoom(-0.1));
    elements.centerMapBtn.addEventListener('click', centerMiniMap);
    
    // Chat
    elements.sendBtn.addEventListener('click', sendChatMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Keyboard input for game
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Mouse input for mini map
    gameState.miniMapCanvas.addEventListener('mousedown', handleMiniMapClick);
    gameState.miniMapCanvas.addEventListener('mousemove', handleMiniMapHover);
    gameState.gameCanvas.addEventListener('mousemove', handleGameMouseMove);
    
    // Window resize
    window.addEventListener('resize', handleResize);
}

// ============================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================

async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // User is already logged in
        await handleUserSession(session.user);
    } else {
        // Show login screen
        elements.loginScreen.classList.remove('hidden');
    }
}

async function handleLogin() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        alert('Vui lòng nhập tên người chơi!');
        return;
    }
    
    // Try to sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously({
        options: {
            data: { username }
        }
    });
    
    if (error) {
        console.error('Login error:', error);
        alert('Đăng nhập thất bại: ' + error.message);
        return;
    }
    
    // Create or update profile
    await createOrUpdateProfile(data.user, username);
    
    // Proceed with session
    await handleUserSession(data.user);
}

async function createOrUpdateProfile(user, username) {
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            username: username,
            display_name: username,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'id'
        });
    
    if (error) {
        console.error('Profile update error:', error);
    }
}

async function handleUserSession(user) {
    // Set user info
    gameState.userId = user.id;
    gameState.username = user.user_metadata?.username || 'Anonymous';
    
    // Update UI
    elements.playerName.textContent = gameState.username;
    elements.playerInitial.textContent = gameState.username.charAt(0).toUpperCase();
    
    // Switch to main screen
    elements.loginScreen.classList.add('hidden');
    elements.mainScreen.classList.remove('hidden');
    
    // Load user data
    await loadUserData();
    
    // Join or create game session
    await joinGameSession();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

async function loadUserData() {
    // Load profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', gameState.userId)
        .single();
    
    if (profile) {
        elements.playerLevel.textContent = profile.level;
        elements.playerScore.textContent = profile.total_score;
    }
    
    // Load team info
    await loadTeamInfo();
}

async function loadTeamInfo() {
    const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', gameState.userId)
        .is('left_at', null)
        .maybeSingle();
    
    if (teamMember) {
        gameState.teamId = teamMember.team_id;
        elements.teamName.textContent = teamMember.teams.name;
        
        // Load team members
        const { data: members } = await supabase
            .from('team_members')
            .select('profiles(username)')
            .eq('team_id', gameState.teamId)
            .is('left_at', null);
        
        elements.teamMembers.innerHTML = '';
        members.forEach(member => {
            const memberEl = document.createElement('div');
            memberEl.className = 'team-member';
            memberEl.textContent = member.profiles.username;
            elements.teamMembers.appendChild(memberEl);
        });
        
        // Show team display
        elements.teamDisplay.classList.remove('hidden');
        elements.noTeam.classList.add('hidden');
    } else {
        gameState.teamId = null;
        elements.teamDisplay.classList.add('hidden');
        elements.noTeam.classList.remove('hidden');
    }
}

// ============================================
// GAME SESSION MANAGEMENT
// ============================================

async function joinGameSession() {
    // Find existing session or create new
    let sessionId = await findAvailableSession();
    
    if (!sessionId) {
        sessionId = await createNewSession();
    }
    
    gameState.sessionId = sessionId;
    
    // Spawn player
    await spawnPlayer();
    
    // Subscribe to real-time updates
    subscribeToGameUpdates();
    
    // Update UI
    elements.gameStatus.textContent = 'Playing';
    elements.leaveGameBtn.classList.remove('hidden');
    gameState.isPlaying = true;
}

async function findAvailableSession() {
    const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id, current_players, max_players')
        .eq('status', 'waiting')
        .lt('current_players', 50)
        .order('created_at', { ascending: true })
        .limit(1);
    
    if (sessions && sessions.length > 0) {
        return sessions[0].id;
    }
    
    return null;
}

async function createNewSession() {
    const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
            map_id: 1,
            max_players: 50,
            current_players: 0,
            status: 'waiting'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating session:', error);
        return null;
    }
    
    return session.id;
}

async function spawnPlayer() {
    const { data: player, error } = await supabase.rpc('spawn_player_randomly', {
        p_user_id: gameState.userId,
        p_session_id: gameState.sessionId,
        p_team_id: gameState.teamId
    });
    
    if (error) {
        console.error('Error spawning player:', error);
        return;
    }
    
    gameState.playerId = player;
    gameState.isAlive = true;
    
    // Load initial player data
    const { data: playerData } = await supabase
        .from('game_players')
        .select('*')
        .eq('id', gameState.playerId)
        .single();
    
    if (playerData) {
        gameState.position = { x: playerData.position_x, y: playerData.position_y };
        gameState.direction = { x: playerData.direction_x, y: playerData.direction_y };
        gameState.score = playerData.score;
        gameState.length = playerData.length;
    }
}

function subscribeToGameUpdates() {
    // Subscribe to players updates
    supabase
        .channel('game-players')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'game_players',
                filter: `session_id=eq.${gameState.sessionId}`
            },
            (payload) => {
                handlePlayerUpdate(payload);
            }
        )
        .subscribe();
    
    // Subscribe to foods updates
    supabase
        .channel('game-foods')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'foods',
                filter: `session_id=eq.${gameState.sessionId}`
            },
            (payload) => {
                handleFoodUpdate(payload);
            }
        )
        .subscribe();
    
    // Subscribe to session updates
    supabase
        .channel('game-sessions')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'game_sessions',
                filter: `id=eq.${gameState.sessionId}`
            },
            (payload) => {
                handleSessionUpdate(payload);
            }
        )
        .subscribe();
}

// ============================================
// REAL-TIME UPDATE HANDLERS
// ============================================

function handlePlayerUpdate(payload) {
    const player = payload.new;
    
    switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
            gameState.players.set(player.id, player);
            
            // If this is our player, update local state
            if (player.id === gameState.playerId) {
                gameState.position = { x: player.position_x, y: player.position_y };
                gameState.direction = { x: player.direction_x, y: player.direction_y };
                gameState.score = player.score;
                gameState.length = player.length;
                gameState.isAlive = player.is_alive;
                
                if (!player.is_alive && gameState.isAlive) {
                    handlePlayerDeath();
                }
            }
            break;
            
        case 'DELETE':
            gameState.players.delete(payload.old.id);
            break;
    }
    
    updateLeaderboard();
}

function handleFoodUpdate(payload) {
    const food = payload.new;
    
    switch (payload.eventType) {
        case 'INSERT':
            gameState.foods.set(food.id, food);
            break;
            
        case 'UPDATE':
            if (food.eaten_at) {
                gameState.foods.delete(food.id);
                
                // If we ate this food
                if (food.eaten_by === gameState.playerId) {
                    playEatSound();
                }
            } else {
                gameState.foods.set(food.id, food);
            }
            break;
            
        case 'DELETE':
            gameState.foods.delete(payload.old.id);
            break;
    }
}

function handleSessionUpdate(payload) {
    const session = payload.new;
    
    // Update UI
    elements.gamePlayers.textContent = `${session.current_players}/${session.max_players}`;
    elements.gameStatus.textContent = session.status === 'playing' ? 'Playing' : 'Waiting';
}

// ============================================
// GAME LOOP & RENDERING
// ============================================

function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - gameState.lastUpdate;
    gameState.lastUpdate = timestamp;
    
    // Update game state
    updateGameState(deltaTime);
    
    // Clear canvas
    gameState.ctx.clearRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);
    gameState.miniMapCtx.clearRect(0, 0, GAME_CONFIG.miniMapSize, GAME_CONFIG.miniMapSize);
    
    // Draw game world
    drawGameWorld();
    
    // Draw mini map
    drawMiniMap();
    
    // Update UI
    updateUI();
    
    // Continue game loop
    if (gameState.isPlaying) {
        requestAnimationFrame(gameLoop);
    }
}

function updateGameState(deltaTime) {
    if (!gameState.isAlive || !gameState.isPlaying) return;
    
    // Handle input
    handleInput();
    
    // Update position
    const speed = Date.now() < gameState.boostEndTime ? 
                  GAME_CONFIG.boostSpeed : GAME_CONFIG.playerSpeed;
    
    gameState.position.x += gameState.velocity.x * speed;
    gameState.position.y += gameState.velocity.y * speed;
    
    // Wrap around map boundaries
    if (gameState.position.x < 0) gameState.position.x = GAME_CONFIG.mapWidth;
    if (gameState.position.x > GAME_CONFIG.mapWidth) gameState.position.x = 0;
    if (gameState.position.y < 0) gameState.position.y = GAME_CONFIG.mapHeight;
    if (gameState.position.y > GAME_CONFIG.mapHeight) gameState.position.y = 0;
    
    // Update camera to follow player
    gameState.camera.x = gameState.position.x;
    gameState.camera.y = gameState.position.y;
    
    // Send update to server (throttled)
    if (Date.now() - gameState.lastUpdate > 1000 / 30) { // 30Hz update rate
        updatePlayerOnServer();
        checkFoodCollisions();
        gameState.lastUpdate = Date.now();
    }
    
    // Auto spawn food
    if (Date.now() - gameState.lastFoodSpawn > 1000 / GAME_CONFIG.foodSpawnRate) {
        spawnFoodRandomly();
        gameState.lastFoodSpawn = Date.now();
    }
}

function handleInput() {
    // Reset velocity
    gameState.velocity.x = 0;
    gameState.velocity.y = 0;
    
    // Movement keys
    if (gameState.keys['ArrowUp'] || gameState.keys['w']) {
        gameState.velocity.y = -1;
        gameState.direction = { x: 0, y: -1 };
    }
    if (gameState.keys['ArrowDown'] || gameState.keys['s']) {
        gameState.velocity.y = 1;
        gameState.direction = { x: 0, y: 1 };
    }
    if (gameState.keys['ArrowLeft'] || gameState.keys['a']) {
        gameState.velocity.x = -1;
        gameState.direction = { x: -1, y: 0 };
    }
    if (gameState.keys['ArrowRight'] || gameState.keys['d']) {
        gameState.velocity.x = 1;
        gameState.direction = { x: 1, y: 0 };
    }
    
    // Boost (Space)
    if (gameState.keys[' '] && Date.now() > gameState.boostEndTime + 5000) {
        gameState.boostEndTime = Date.now() + GAME_CONFIG.boostDuration;
        playBoostSound();
    }
    
    // Normalize diagonal movement
    if (gameState.velocity.x !== 0 && gameState.velocity.y !== 0) {
        gameState.velocity.x *= 0.7071; // 1/√2
        gameState.velocity.y *= 0.7071;
    }
}

async function updatePlayerOnServer() {
    await supabase
        .from('game_players')
        .update({
            position_x: gameState.position.x,
            position_y: gameState.position.y,
            direction_x: gameState.direction.x,
            direction_y: gameState.direction.y,
            speed: Date.now() < gameState.boostEndTime ? GAME_CONFIG.boostSpeed : GAME_CONFIG.playerSpeed,
            is_boosted: Date.now() < gameState.boostEndTime,
            boost_until: Date.now() < gameState.boostEndTime ? 
                new Date(gameState.boostEndTime).toISOString() : null,
            last_updated: new Date().toISOString()
        })
        .eq('id', gameState.playerId);
}

async function checkFoodCollisions() {
    const { data: eatenFoods } = await supabase.rpc('check_food_collision', {
        p_player_id: gameState.playerId,
        p_player_x: gameState.position.x,
        p_player_y: gameState.position.y
    });
    
    if (eatenFoods && eatenFoods.length > 0) {
        // Update player score and length
        let totalValue = 0;
        eatenFoods.forEach(food => {
            totalValue += food.food_value;
        });
        
        const newScore = gameState.score + totalValue * 10;
        const newLength = gameState.length + totalValue;
        
        await supabase
            .from('game_players')
            .update({
                score: newScore,
                length: newLength
            })
            .eq('id', gameState.playerId);
        
        // Update local state
        gameState.score = newScore;
        gameState.length = newLength;
    }
}

async function spawnFoodRandomly() {
    // Count current food
    const foodCount = gameState.foods.size;
    const { data: config } = await supabase
        .from('map_config')
        .select('min_food_count')
        .single();
    
    if (foodCount < config.min_food_count) {
        const foodsNeeded = config.min_food_count - foodCount;
        
        for (let i = 0; i < foodsNeeded; i++) {
            await supabase
                .from('foods')
                .insert({
                    session_id: gameState.sessionId,
                    position_x: Math.random() * GAME_CONFIG.mapWidth,
                    position_y: Math.random() * GAME_CONFIG.mapHeight,
                    type: Math.random() < 0.1 ? 'special' : 'normal',
                    value: Math.random() < 0.1 ? 5 : 1,
                    color: Math.random() < 0.1 ? '#FFD700' : '#00FF00'
                });
        }
    }
}

function drawGameWorld() {
    // Calculate view bounds
    const viewLeft = gameState.camera.x - GAME_CONFIG.canvasWidth / 2 / gameState.camera.zoom;
    const viewTop = gameState.camera.y - GAME_CONFIG.canvasHeight / 2 / gameState.camera.zoom;
    const viewWidth = GAME_CONFIG.canvasWidth / gameState.camera.zoom;
    const viewHeight = GAME_CONFIG.canvasHeight / gameState.camera.zoom;
    
    // Draw background grid
    drawGrid(viewLeft, viewTop, viewWidth, viewHeight);
    
    // Draw foods
    gameState.foods.forEach(food => {
        if (food.eaten_at) return;
        
        // Check if food is in view
        if (food.position_x < viewLeft || food.position_x > viewLeft + viewWidth ||
            food.position_y < viewTop || food.position_y > viewTop + viewHeight) {
            return;
        }
        
        // Calculate screen position
        const screenX = (food.position_x - viewLeft) * gameState.camera.zoom;
        const screenY = (food.position_y - viewTop) * gameState.camera.zoom;
        
        // Draw food
        gameState.ctx.fillStyle = food.color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, 5 * gameState.camera.zoom, 0, Math.PI * 2);
        gameState.ctx.fill();
        
        // Draw glow for special food
        if (food.type === 'special') {
            gameState.ctx.shadowColor = food.color;
            gameState.ctx.shadowBlur = 10;
            gameState.ctx.beginPath();
            gameState.ctx.arc(screenX, screenY, 8 * gameState.camera.zoom, 0, Math.PI * 2);
            gameState.ctx.fill();
            gameState.ctx.shadowBlur = 0;
        }
    });
    
    // Draw players
    gameState.players.forEach(player => {
        if (!player.is_alive) return;
        
        // Check if player is in view
        if (player.position_x < viewLeft || player.position_x > viewLeft + viewWidth ||
            player.position_y < viewTop || player.position_y > viewTop + viewHeight) {
            return;
        }
        
        // Calculate screen position
        const screenX = (player.position_x - viewLeft) * gameState.camera.zoom;
        const screenY = (player.position_y - viewTop) * gameState.camera.zoom;
        
        // Determine color based on team
        let color = player.color;
        let isTeammate = false;
        
        if (gameState.teamId && player.team_id === gameState.teamId) {
            color = '#3498db'; // Blue for teammates
            isTeammate = true;
        } else if (player.id === gameState.playerId) {
            color = '#f39c12'; // Orange for self
        } else {
            color = '#e74c3c'; // Red for enemies
        }
        
        // Draw snake head
        gameState.ctx.fillStyle = color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, 10 * gameState.camera.zoom, 0, Math.PI * 2);
        gameState.ctx.fill();
        
        // Draw direction indicator
        gameState.ctx.strokeStyle = '#ffffff';
        gameState.ctx.lineWidth = 2 * gameState.camera.zoom;
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(screenX, screenY);
        gameState.ctx.lineTo(
            screenX + player.direction_x * 15 * gameState.camera.zoom,
            screenY + player.direction_y * 15 * gameState.camera.zoom
        );
        gameState.ctx.stroke();
        
        // Draw player name
        gameState.ctx.fillStyle = '#ffffff';
        gameState.ctx.font = `${12 * gameState.camera.zoom}px Arial`;
        gameState.ctx.textAlign = 'center';
        gameState.ctx.fillText(player.username || 'Player', screenX, screenY - 20 * gameState.camera.zoom);
        
        // Draw team tag if teammate
        if (isTeammate) {
            gameState.ctx.fillStyle = '#2ecc71';
            gameState.ctx.font = `${10 * gameState.camera.zoom}px Arial`;
            gameState.ctx.fillText('[TEAM]', screenX, screenY - 35 * gameState.camera.zoom);
        }
        
        // Draw snake body (simplified)
        for (let i = 1; i < Math.min(player.length, 20); i++) {
            const bodyX = screenX - player.direction_x * i * 8 * gameState.camera.zoom;
            const bodyY = screenY - player.direction_y * i * 8 * gameState.camera.zoom;
            
            gameState.ctx.fillStyle = color;
            gameState.ctx.globalAlpha = 1 - (i * 0.05);
            gameState.ctx.beginPath();
            gameState.ctx.arc(bodyX, bodyY, 8 * gameState.camera.zoom, 0, Math.PI * 2);
            gameState.ctx.fill();
        }
        gameState.ctx.globalAlpha = 1;
        
        // Draw boost effect
        if (player.is_boosted) {
            gameState.ctx.strokeStyle = '#f1c40f';
            gameState.ctx.lineWidth = 3 * gameState.camera.zoom;
            gameState.ctx.beginPath();
            gameState.ctx.arc(screenX, screenY, 15 * gameState.camera.zoom, 0, Math.PI * 2);
            gameState.ctx.stroke();
        }
    });
}

function drawGrid(viewLeft, viewTop, viewWidth, viewHeight) {
    const gridSize = 100;
    const startX = Math.floor(viewLeft / gridSize) * gridSize;
    const startY = Math.floor(viewTop / gridSize) * gridSize;
    
    gameState.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    gameState.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = startX; x < viewLeft + viewWidth; x += gridSize) {
        const screenX = (x - viewLeft) * gameState.camera.zoom;
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(screenX, 0);
        gameState.ctx.lineTo(screenX, GAME_CONFIG.canvasHeight);
        gameState.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = startY; y < viewTop + viewHeight; y += gridSize) {
        const screenY = (y - viewTop) * gameState.camera.zoom;
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(0, screenY);
        gameState.ctx.lineTo(GAME_CONFIG.canvasWidth, screenY);
        gameState.ctx.stroke();
    }
}

function drawMiniMap() {
    const ctx = gameState.miniMapCtx;
    const size = GAME_CONFIG.miniMapSize;
    const scale = size / GAME_CONFIG.mapWidth * gameState.miniMapZoom;
    
    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 100 * scale;
    
    for (let x = 0; x < size; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
    }
    
    for (let y = 0; y < size; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }
    
    // Draw foods on mini map
    gameState.foods.forEach(food => {
        if (food.eaten_at) return;
        
        const x = food.position_x * scale;
        const y = food.position_y * scale;
        
        if (x < 0 || x > size || y < 0 || y > size) return;
        
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw players on mini map
    gameState.players.forEach(player => {
        if (!player.is_alive) return;
        
        const x = player.position_x * scale;
        const y = player.position_y * scale;
        
        if (x < 0 || x > size || y < 0 || y > size) return;
        
        // Determine color
        let color;
        if (player.id === gameState.playerId) {
            color = '#f39c12'; // Self - yellow
            // Draw larger circle for self
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw direction arrow
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + player.direction_x * 10,
                y + player.direction_y * 10
            );
            ctx.stroke();
        } else if (gameState.teamId && player.team_id === gameState.teamId) {
            color = '#3498db'; // Teammate - blue
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            color = '#e74c3c'; // Enemy - red
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw viewport rectangle
    const viewportWidth = GAME_CONFIG.canvasWidth / gameState.camera.zoom * scale;
    const viewportHeight = GAME_CONFIG.canvasHeight / gameState.camera.zoom * scale;
    const viewportX = (gameState.camera.x - GAME_CONFIG.canvasWidth / 2 / gameState.camera.zoom) * scale;
    const viewportY = (gameState.camera.y - GAME_CONFIG.canvasHeight / 2 / gameState.camera.zoom) * scale;
    
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    ctx.setLineDash([]);
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    // Update score and length
    elements.playerScore.textContent = gameState.score;
    
    // Update leaderboard
    updateLeaderboard();
    
    // Update game info
    const currentPlayer = gameState.players.get(gameState.playerId);
    if (currentPlayer) {
        elements.gamePlayers.textContent = `${gameState.players.size}/50`;
    }
}

function updateLeaderboard() {
    // Convert players map to array and sort by score
    const playersArray = Array.from(gameState.players.values())
        .filter(p => p.is_alive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10
    
    elements.leaderboard.innerHTML = '';
    
    playersArray.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        // Add special classes
        if (player.id === gameState.playerId) {
            item.classList.add('self');
        } else if (gameState.teamId && player.team_id === gameState.teamId) {
            item.classList.add('teammate');
        }
        
        item.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="player-name">${player.username || 'Player'}</span>
            <span class="score">${player.score}</span>
        `;
        
        elements.leaderboard.appendChild(item);
    });
}

function updateChat() {
    elements.chatMessages.innerHTML = '';
    
    // Show last 10 messages
    const recentMessages = gameState.chatMessages.slice(-10);
    
    recentMessages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${msg.type}`;
        
        let sender = '';
        if (msg.sender === gameState.userId) {
            sender = 'You';
        } else if (gameState.teamId && msg.teamId === gameState.teamId) {
            sender = msg.username;
        } else {
            sender = msg.username;
        }
        
        messageEl.innerHTML = `
            <strong>${sender}:</strong> ${msg.text}
        `;
        
        elements.chatMessages.appendChild(messageEl);
    });
    
    // Auto scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleKeyDown(e) {
    gameState.keys[e.key] = true;
    
    // Toggle mini map with 'M'
    if (e.key === 'm' || e.key === 'M') {
        const miniMap = document.querySelector('.mini-map-container');
        miniMap.classList.toggle('hidden');
    }
    
    // Open chat with 'T'
    if (e.key === 't' || e.key === 'T') {
        elements.chatInput.focus();
    }
    
    // Prevent space bar from scrolling
    if (e.key === ' ') {
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    gameState.keys[e.key] = false;
}

function handleMiniMapClick(e) {
    const rect = gameState.miniMapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click position to game world coordinates
    const scale = GAME_CONFIG.mapWidth / (GAME_CONFIG.miniMapSize / gameState.miniMapZoom);
    const worldX = x * scale;
    const worldY = y * scale;
    
    // Center camera on clicked position
    gameState.camera.x = worldX;
    gameState.camera.y = worldY;
}

function handleMiniMapHover(e) {
    const rect = gameState.miniMapCanvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
}

function handleGameMouseMove(e) {
    const rect = gameState.gameCanvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
}

function handleResize() {
    // Adjust canvas size if needed
    // In a real implementation, you'd want to handle responsive design
}

// ============================================
// TEAM MANAGEMENT
// ============================================

function showTeamModal() {
    elements.teamModal.classList.remove('hidden');
}

function hideTeamModal() {
    elements.teamModal.classList.add('hidden');
    elements.teamNameInput.value = '';
    elements.teamTagInput.value = '';
    elements.teamPassword.value = '';
}

function togglePasswordField() {
    const privacy = elements.teamPrivacy.value;
    elements.teamPasswordGroup.classList.toggle('hidden', privacy !== 'password');
}

async function handleCreateTeam() {
    const name = elements.teamNameInput.value.trim();
    const tag = elements.teamTagInput.value.trim();
    const privacy = elements.teamPrivacy.value;
    const password = elements.teamPassword.value;
    
    if (!name || name.length < 3) {
        alert('Tên đội phải có ít nhất 3 ký tự');
        return;
    }
    
    if (tag && (tag.length < 2 || tag.length > 4)) {
        alert('Tag đội phải có 2-4 ký tự');
        return;
    }
    
    try {
        const { data: team, error } = await supabase
            .from('teams')
            .insert({
                name: name,
                tag: tag || null,
                leader_id: gameState.userId,
                privacy: privacy,
                password_hash: password ? await hashPassword(password) : null
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Join the team
        await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: gameState.userId,
                role: 'leader'
            });
        
        // Update local state
        gameState.teamId = team.id;
        
        // Update UI
        await loadTeamInfo();
        
        // Hide modal
        hideTeamModal();
        
        // Show success message
        addChatMessage({
            type: 'system',
            text: `Đã tạo đội "${name}" thành công!`
        });
        
    } catch (error) {
        console.error('Error creating team:', error);
        alert('Tạo đội thất bại: ' + error.message);
    }
}

async function handleJoinTeam() {
    const teamName = prompt('Nhập tên đội muốn tham gia:');
    if (!teamName) return;
    
    try {
        // Find team
        const { data: teams, error } = await supabase
            .from('teams')
            .select('*')
            .ilike('name', teamName)
            .limit(1);
        
        if (error) throw error;
        
        if (!teams || teams.length === 0) {
            alert('Không tìm thấy đội');
            return;
        }
        
        const team = teams[0];
        
        // Check privacy
        if (team.privacy === 'password') {
            const password = prompt('Nhập mật khẩu đội:');
            if (!password) return;
            
            // In real app, you'd verify the password hash
            const hashedPassword = await hashPassword(password);
            if (hashedPassword !== team.password_hash) {
                alert('Mật khẩu không đúng');
                return;
            }
        }
        
        // Join team
        await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: gameState.userId,
                role: 'member'
            });
        
        // Update local state
        gameState.teamId = team.id;
        
        // Update UI
        await loadTeamInfo();
        
        // Show success message
        addChatMessage({
            type: 'system',
            text: `Đã tham gia đội "${team.name}"!`
        });
        
    } catch (error) {
        console.error('Error joining team:', error);
        alert('Tham gia đội thất bại: ' + error.message);
    }
}

async function hashPassword(password) {
    // Simple hash for demo - in production use proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============================================
// CHAT SYSTEM
// ============================================

async function sendChatMessage() {
    const text = elements.chatInput.value.trim();
    if (!text) return;
    
    const type = elements.chatType.value;
    
    // Create message object
    const message = {
        type: type,
        sender: gameState.userId,
        username: gameState.username,
        text: text,
        timestamp: Date.now(),
        teamId: gameState.teamId
    };
    
    // Add to local chat
    addChatMessage(message);
    
    // In a real implementation, you'd send this to a chat channel
    // For now, we'll just broadcast to all clients in the session
    await broadcastChatMessage(message);
    
    // Clear input
    elements.chatInput.value = '';
}

function addChatMessage(message) {
    gameState.chatMessages.push(message);
    updateChat();
}

async function broadcastChatMessage(message) {
    // In a real app, you'd use Supabase Realtime for chat
    // For this demo, we'll simulate by updating a chat table
    const { error } = await supabase
        .from('chat_messages') // You'd need to create this table
        .insert({
            session_id: gameState.sessionId,
            user_id: message.sender,
            type: message.type,
            text: message.text,
            team_id: message.teamId
        });
    
    if (error) {
        console.error('Error sending chat message:', error);
    }
}

// ============================================
// GAME EVENTS
// ============================================

function handlePlayerDeath() {
    gameState.isAlive = false;
    elements.gameOverlay.classList.remove('hidden');
    elements.finalScore.textContent = gameState.score;
    
    // Play death sound
    playDeathSound();
    
    // Save match history
    saveMatchHistory();
}

async function handleLeaveGame() {
    if (gameState.playerId) {
        await supabase
            .from('game_players')
            .update({ is_alive: false })
            .eq('id', gameState.playerId);
    }
    
    // Reset game state
    resetGameState();
    
    // Update UI
    elements.gameStatus.textContent = 'Waiting';
    elements.leaveGameBtn.classList.add('hidden');
    elements.gameOverlay.classList.add('hidden');
    
    gameState.isPlaying = false;
}

async function handlePlayAgain() {
    // Hide game over screen
    elements.gameOverlay.classList.add('hidden');
    
    // Spawn new player
    await spawnPlayer();
    
    // Reset local game state
    gameState.score = 0;
    gameState.length = 3;
    gameState.isAlive = true;
}

function resetGameState() {
    gameState.players.clear();
    gameState.foods.clear();
    gameState.playerId = null;
    gameState.sessionId = null;
    gameState.isPlaying = false;
    gameState.isAlive = false;
    gameState.score = 0;
    gameState.length = 3;
    gameState.position = { x: 0, y: 0 };
    gameState.direction = { x: 1, y: 0 };
    gameState.velocity = { x: 0, y: 0 };
}

async function saveMatchHistory() {
    const player = gameState.players.get(gameState.playerId);
    if (!player) return;
    
    await supabase
        .from('match_history')
        .insert({
            session_id: gameState.sessionId,
            user_id: gameState.userId,
            team_id: gameState.teamId,
            final_score: player.score,
            final_length: player.length,
            time_played: Math.floor((Date.now() - new Date(player.joined_at).getTime()) / 1000)
        });
}

// ============================================
// AUDIO FUNCTIONS
// ============================================

function playEatSound() {
    // In a real game, you'd play an actual sound file
    console.log('Nom nom! Food eaten!');
}

function playBoostSound() {
    console.log('Boost activated!');
}

function playDeathSound() {
    console.log('Game over!');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function adjustMiniMapZoom(amount) {
    gameState.miniMapZoom = Math.max(0.05, Math.min(0.5, gameState.miniMapZoom + amount));
}

function centerMiniMap() {
    gameState.camera.x = gameState.position.x;
    gameState.camera.y = gameState.position.y;
}

// ============================================
// START THE GAME
// ============================================

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.gameState = gameState;
window.supabase = supabase;