const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameStarted = false;
let paused = false;

// STOP game until start
function startGame(){
    document.getElementById("startScreen").style.display = "none";
    gameStarted = true;

    updateHealthUI(); 
}

function goHome(){
    window.location.href = "index.html";
}

function resumeGame(){
    paused = false;
    document.getElementById("pauseScreen").style.display = "none";

    lastTime = performance.now();

    animate();
}

function restartGame() {
    location.reload();
}

// ESC key pause
window.addEventListener('keydown', (e)=>{
    if(e.key === "Escape" && gameStarted){
        paused = !paused;

        if(paused){
            document.getElementById("pauseScreen").style.display = "block";
        } else {
            document.getElementById("pauseScreen").style.display = "none";
            
            lastTime = performance.now();

            animate();
        }
    }
});

// --- AUDIO SYNTHESIZER ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- LOAD IMAGES ---
const playerImg = new Image();
playerImg.src = 'assets/superman_v2.png';

const enemyImg = new Image();
enemyImg.src = 'assets/demon_boss.png';

const healthImg = new Image();
healthImg.src = 'assets/health.png';

const spikeEnemyImg = new Image();
spikeEnemyImg.src = 'assets/spike_enemy.png';

const zigzagEnemyImg = new Image();
zigzagEnemyImg.src = 'assets/zigzag.png';

const tankEnemyImg = new Image();
tankEnemyImg.src = 'assets/tank.png';

const dasherEnemyImg = new Image();
dasherEnemyImg.src = 'assets/dasher.png';

// --- GAME VARIABLES ---
let score = 0;
let health = 100;

let gameActive = true;

const keys = { w: false, a: false, s: false, d: false };
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let bullets = [];
let enemies = [];

let enemyBullets = [];

let lastTime = 0;

let healthPack = null;
let healthPackTimer = null;

let startTime = Date.now();
let survivalTime = 0;


let particles = [];
let shockwaves = [];

let hitFlash = 0;
let shake = 0;

function createExplosion(x, y) {
    if (particles.length > 500) return;

    const explosionRadius = 80;

    // PARTICLES
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            velX: (Math.random() - 0.5) * 6,
            velY: (Math.random() - 0.5) * 6,
            life: 30
        });
    }

    // SHOCKWAVE
    shockwaves.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: explosionRadius
    });

    // 💥 AOE DAMAGE + ⚡ KNOCKBACK + CHAIN
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.hypot(dx, dy) || 0.1;

        if (dist < explosionRadius && (Date.now() - enemy.spawnTime > 300)) {

            // ⚡ KNOCKBACK
            const force = (explosionRadius - dist) / explosionRadius;
            enemy.x += (dx / dist) * force * 50;
            enemy.y += (dy / dist) * force * 50;

            // 💥 REMOVE ENEMY
            enemies.splice(i, 1);
            score += 10;

            // 🔥 CHAIN EXPLOSION (ALL ENEMIES)
            // 🔥 limit chain explosions to avoid spam
            if (particles.length < 300) {
                setTimeout(() => {
                    createExplosion(enemy.x, enemy.y);
                }, 100);
            }
        }
    }

    document.getElementById('score').innerText = score;
}


// --- PLAYER OBJECT ---
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: '#00ffcc',
    speed: 5
};

// --- INPUT LISTENERS ---
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    
    playSound('shoot');
    
    const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
    bullets.push({
        x: player.x,
        y: player.y,
        velX: Math.cos(angle) * 15,
        velY: Math.sin(angle) * 15,
        radius: 5,
        color: '#ffff00'
    });
});

// --- HEALTH PACK SPAWN ---
function spawnHealthPack() {
    healthPack = {
        x: Math.random() * (canvas.width - 60) + 30,
        y: Math.random() * (canvas.height - 60) + 30,
        size: 30
    };

    clearTimeout(healthPackTimer);
    healthPackTimer = setTimeout(() => {
        healthPack = null;
        spawnHealthPack();
    }, Math.random() * 5000 + 15000);
}

// --- ENEMY SPAWNER ---

let spawnRate = 1800;
let difficultyTimer = 0;

function spawnEnemy() {

    if (enemies.length >= 20) return;

    const rand = Math.random();
    let enemyType;

    // 🎯 TIME-BASED UNLOCK SYSTEM
    if (survivalTime < 20) {
        enemyType = 'normal';
    }
    else if (survivalTime < 40) {
        enemyType = (rand < 0.7) ? 'normal' : 'spike';
    }
    else if (survivalTime < 60) {
        if (rand < 0.5) enemyType = 'normal';
        else if (rand < 0.8) enemyType = 'spike';
        else enemyType = 'zigzag';
    }
    else if (survivalTime < 90) {
        if (rand < 0.4) enemyType = 'normal';
        else if (rand < 0.7) enemyType = 'spike';
        else if (rand < 0.9) enemyType = 'zigzag';
        else enemyType = 'tank';
    }
    else {
        if (rand < 0.3) enemyType = 'normal';
        else if (rand < 0.6) enemyType = 'spike';
        else if (rand < 0.8) enemyType = 'zigzag';
        else if (rand < 0.95) enemyType = 'tank';
        else enemyType = 'dasher';
    }

    // 🌊 WAVE SPAWN (20% chance)
    if (Math.random() < 0.1) {
        spawnWave(enemyType);
        return;
    }

    // NORMAL SPAWN
    spawnFromEdge(enemyType);
}

function spawnFromEdge(enemyType) {

    const side = Math.floor(Math.random() * 4);
    let x, y;

    // 1️⃣ SET POSITION FIRST
    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -100;
    } 
    else if (side === 1) {
        x = canvas.width + 100;
        y = Math.random() * canvas.height;
    } 
    else if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 100;
    } 
    else {
        x = -100;
        y = Math.random() * canvas.height;
    }

    // 2️⃣ THEN CHECK DISTANCE
    const safeDistance = 200;

    let attempts = 0;

    while (Math.hypot(player.x - x, player.y - y) < safeDistance && attempts < 5) {

        const side = Math.floor(Math.random() * 4);

        if (side === 0) {
            x = Math.random() * canvas.width;
            y = -100;
        } 
        else if (side === 1) {
            x = canvas.width + 100;
            y = Math.random() * canvas.height;
        } 
        else if (side === 2) {
            x = Math.random() * canvas.width;
            y = canvas.height + 100;
        } 
        else {
            x = -100;
            y = Math.random() * canvas.height;
        }

        attempts++;
    }

    let size = 50;
    let speed = 2;

    if (enemyType === 'spike') {
        size = 60;
        speed = 1.5;
    }
    else if (enemyType === 'zigzag') {
        size = 50;
        speed = 2.5;
    }
    else if (enemyType === 'tank') {
        size = 80;
        speed = 1;
    }
    else if (enemyType === 'dasher') {
       size = 45;
        speed = 4.5;
    }

    enemies.push({
        x: x,
        y: y,
        size: size,
        speed: speed,
        type: enemyType,
        health: (enemyType === 'tank') ? 2 : 1,
        spawnTime: Date.now(),
        shootCooldown: 0,
        dashTimer: 0
    });
}

function spawnWave(enemyType) {

    const count = 4 + Math.floor(Math.random() * 3); // 4–6 enemies
    const side = Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {

        let x, y;

        // ✅ spawn further outside screen (fixed from 50 → 100)
        if (side === 0) { // TOP
            x = (canvas.width / count) * i;
            y = -100;
        } 
        else if (side === 1) { // RIGHT
            x = canvas.width + 100;
            y = (canvas.height / count) * i;
        } 
        else if (side === 2) { // BOTTOM
            x = (canvas.width / count) * i;
            y = canvas.height + 100;
        } 
        else { // LEFT
            x = -100;
            y = (canvas.height / count) * i;
        }

        // ✅ prevent spawning too close to player (NEW)

        const safeDistance = 200;
        
        let attempts = 0;

        while (Math.hypot(player.x - x, player.y - y) < safeDistance && attempts < 3) {
            x += Math.random() * 50 - 25;
            y += Math.random() * 50 - 25;
            attempts++;
        }

        let size = 50;
        let speed = 2;

        if (enemyType === 'spike') {
            size = 60;
            speed = 1.5;
        }
        else if (enemyType === 'zigzag') {
            size = 50;
            speed = 2.5;
        }
        else if (enemyType === 'tank') {
            size = 80;
            speed = 1;
        }
        else if (enemyType === 'dasher') {
            size = 45;
            speed = 4.5;
        }

        enemies.push({
            x: x,
            y: y,
            size: size,
            speed: speed,
            type: enemyType,
            health: (enemyType === 'tank') ? 2 : 1,
            spawnTime: Date.now(),
            shootCooldown: 0,
            dashTimer: 0
        });
    }
}

// 🔁 MAIN SPAWN LOOP (DYNAMIC SPEED)
function startSpawner() {

    function loop() {
        
        if (!gameActive) return;

        spawnEnemy();

        difficultyTimer++;

        if (difficultyTimer % 15 === 0 && spawnRate > 600) {
            spawnRate -= 30;
        }

        setTimeout(loop, spawnRate);
    }

    loop();
}

// START IT
startSpawner();



function updateHealthUI() {
    const healthBar = document.getElementById('healthBar');

    // update width
    healthBar.style.width = health + '%';

    // low health effect
    if (health < 30) {
        healthBar.classList.add('low-health');
    } else {
        healthBar.classList.remove('low-health');
    }
}



// --- MAIN GAME LOOP ---

function animate(time) {
    requestAnimationFrame(animate);
    let deltaTime = (time - lastTime) / 16;
    deltaTime = Math.min(deltaTime, 2);
    lastTime = time;

    if (!gameStarted) return;
    if (paused) return;
    if (!gameActive) return;

    survivalTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('time').innerText = survivalTime;

    ctx.save();

    let shakeX = 0;
    let shakeY = 0;

    if (shake > 0) {
        shakeX = (Math.random() - 0.5) * shake;
        shakeY = (Math.random() - 0.5) * shake;
        shake *= 0.9;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(shakeX, shakeY);

    if (hitFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${hitFlash * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hitFlash -= 0.05;
    }

    ctx.restore();

    // PLAYER MOVEMENT
    if (keys.w && player.y - player.radius > 0) player.y -= player.speed * deltaTime;
    if (keys.s && player.y + player.radius < canvas.height) player.y += player.speed * deltaTime;
    if (keys.a && player.x - player.radius > 0) player.x -= player.speed * deltaTime;
    if (keys.d && player.x + player.radius < canvas.width) player.x += player.speed * deltaTime;

    // AIM LINE
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.stroke();

    // PLAYER DRAW
    if (playerImg.complete && playerImg.naturalHeight !== 0) {
        ctx.drawImage(playerImg, player.x - 25, player.y - 25, 50, 50);
    } else {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
    }

    // HEALTH PACK
    if (healthPack) {
        if (healthImg.complete && healthImg.naturalHeight !== 0) {
            ctx.drawImage(healthImg, healthPack.x - 15, healthPack.y - 15, 30, 30);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(healthPack.x - 15, healthPack.y - 15, 30, 30);
        }

        const dist = Math.hypot(player.x - healthPack.x, player.y - healthPack.y);
        if (dist < player.radius + 15) {
            health = Math.min(100, health + 30);
            document.getElementById('health').innerText = health;
            updateHealthUI();

            healthPack = null;
            clearTimeout(healthPackTimer);
            setTimeout(spawnHealthPack, Math.random() * 5000 + 15000);
        }
    }

    // BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.velX * deltaTime;
        b.y += b.velY * deltaTime;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;

        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.shadowBlur = 0;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // 🔴 ENEMY BULLETS
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];

        b.x += b.velX * deltaTime;
        b.y += b.velY * deltaTime;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        const dist = Math.hypot(player.x - b.x, player.y - b.y);

        if (dist < player.radius + b.radius) {
            enemyBullets.splice(i, 1);

            health = Math.max(0, health - 10);
            hitFlash = 1;
            shake = 10;

            document.getElementById('health').innerText = health;
            updateHealthUI();

            playSound('hit');

            if (health <= 0) {
                gameActive = false;

                document.getElementById('gameOverScreen').style.display = 'block';

                document.getElementById('finalScore').innerText = score;
                document.getElementById('finalTime').innerText = survivalTime;
            }

            continue;
        }

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }

    // PARTICLES (EXPLOSION)
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];

        p.x += p.velX;
        p.y += p.velY;
        p.life--;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'orange';
        ctx.fillStyle = 'orange';
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // SHOCKWAVE EFFECT
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let s = shockwaves[i];
        
        s.radius += 8;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,150,0,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (s.radius > s.maxRadius) {
            shockwaves.splice(i, 1);
        }
    }



    // ENEMIES
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        const angle = Math.atan2(player.y - e.y, player.x - e.x);

        // 🌀 ZIGZAG
        if (e.type === 'zigzag') {

            e.zigzagOffset = (e.zigzagOffset || 0) + 0.1;

            const zigzagStrength = 5;

            e.x += Math.cos(angle) * e.speed * deltaTime 
                + Math.sin(e.zigzagOffset) * zigzagStrength;

            e.y += Math.sin(angle) * e.speed * deltaTime 
                + Math.cos(e.zigzagOffset) * zigzagStrength;
        }

        // 🛡 TANK
        else if (e.type === 'tank') {
            e.x += Math.cos(angle) * e.speed * deltaTime;
            e.y += Math.sin(angle) * e.speed * deltaTime;
        }

        // ⚡ DASHER
        else if (e.type === 'dasher') {
            e.dashTimer--;

            if (e.dashTimer <= 0) {
                e.velX = Math.cos(angle) * 32;
                e.velY = Math.sin(angle) * 32;
                e.dashTimer = 70;
            }

            e.x += (e.velX || 0) * deltaTime;
            e.y += (e.velY || 0) * deltaTime;

            e.velX *= 0.9;
            e.velY *= 0.9;

            // 🔧 stop tiny drifting
            if (Math.abs(e.velX) < 0.1) e.velX = 0;
            if (Math.abs(e.velY) < 0.1) e.velY = 0;
        }

        // 👹 NORMAL + SPIKE
        else {
            e.x += Math.cos(angle) * e.speed * deltaTime;
            e.y += Math.sin(angle) * e.speed * deltaTime;
        }


        // 👾 DEMON BOSS SHOOTING
        if (e.type === 'normal' || e.type === 'tank') {
            e.shootCooldown--;

            if (e.shootCooldown <= 0) {

                const angle = Math.atan2(player.y - e.y, player.x - e.x);

                enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    velX: Math.cos(angle) * 6,
                    velY: Math.sin(angle) * 6,
                    radius: 4,
                    color: 'red'
                });

                e.shootCooldown = (e.type === 'tank') ? 100 : 60;
            }
        }

        // DRAW ENEMY
        if (e.type === 'spike') {
            ctx.drawImage(spikeEnemyImg, e.x - 30, e.y - 30, 60, 60);
        }
        else if (e.type === 'zigzag') {
            ctx.drawImage(zigzagEnemyImg, e.x - 25, e.y - 25, 50, 50);
        }
        else if (e.type === 'tank') {
            ctx.drawImage(tankEnemyImg, e.x - 40, e.y - 40, 80, 80);
        }
        else if (e.type === 'dasher') {
            ctx.drawImage(dasherEnemyImg, e.x - 25, e.y - 25, 50, 50);
        }
        else {
            ctx.drawImage(enemyImg, e.x - 25, e.y - 25, 50, 50);
        }

        // COLLISION WITH PLAYER
        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (distToPlayer - player.radius - e.size/2 < 1) {
            enemies.splice(i, 1);
            health = Math.max(0, health - 20);
            hitFlash = 1;
            shake = 10;
            document.getElementById('health').innerText = health;
            updateHealthUI();

            playSound('hit');

            if (health <= 0) {
                gameActive = false;
                document.getElementById('gameOverScreen').style.display = 'block';
                document.getElementById('finalScore').innerText = score;
                document.getElementById('finalTime').innerText = survivalTime;
            }
            continue;
        }

        // BULLET HIT
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            const distToBullet = Math.hypot(b.x - e.x, b.y - e.y);

            if (distToBullet - b.radius - e.size/2 < 1) {

                e.health--;

                bullets.splice(j, 1);

                if (e.health <= 0) {
                    createExplosion(e.x, e.y);

                    score += 10;
                    document.getElementById('score').innerText = score;

                    enemies.splice(i, 1);
                }

                break;
            }
        }
    }
}


setTimeout(spawnHealthPack, Math.random() * 5000 + 15000);

animate();

function showControls() {
    document.getElementById('controlsModal').style.display = 'flex';
}

function closeControls() {
    document.getElementById('controlsModal').style.display = 'none';
}

function closeControls() {
    document.getElementById('controlsModal').style.display = "none";
}