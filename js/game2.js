const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

// --- GAME VARIABLES ---
let score = 0;
let health = 100;
let gameActive = true;

const keys = { w: false, a: false, s: false, d: false };
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let bullets = [];
let enemies = [];

let healthPack = null;
let healthPackTimer = null;

let startTime = Date.now();
let survivalTime = 0;

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
    }, 15000);
}

// --- ENEMY SPAWNER ---
setInterval(() => {
    if (!gameActive) return;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -50 : canvas.height + 50;
    }
    enemies.push({ x: x, y: y, size: 25, color: '#ff4d4d', speed: Math.random() * 2 + 1 });
}, 1000);

// --- MAIN GAME LOOP ---
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);
    survivalTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('time').innerText = survivalTime;

    ctx.fillStyle = 'rgba(11, 11, 26, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (keys.w && player.y - player.radius > 0) player.y -= player.speed;
    if (keys.s && player.y + player.radius < canvas.height) player.y += player.speed;
    if (keys.a && player.x - player.radius > 0) player.x -= player.speed;
    if (keys.d && player.x + player.radius < canvas.width) player.x += player.speed;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.stroke();

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
            document.getElementById('healthBar').style.width = health + '%';

            healthPack = null;
            clearTimeout(healthPackTimer);
            setTimeout(spawnHealthPack, 15000);
        }
    }

    // BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.velX;
        b.y += b.velY;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // ENEMIES
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        if (enemyImg.complete && enemyImg.naturalHeight !== 0) {
            ctx.drawImage(enemyImg, e.x - 25, e.y - 25, 50, 50);
        } else {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
        }

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (distToPlayer - player.radius - e.size/2 < 1) {
            enemies.splice(i, 1);
            health -= 20;
            health = Math.max(0, health);
            document.getElementById('health').innerText = health;
            document.getElementById('healthBar').style.width = health + '%';

            playSound('hit');

            if (health <= 0) {
                gameActive = false;
                document.getElementById('gameOverScreen').style.display = 'block';
                document.getElementById('finalScore').innerText = score;
                document.getElementById('finalTime').innerText = survivalTime;
            }
            continue;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            const distToBullet = Math.hypot(b.x - e.x, b.y - e.y);

            if (distToBullet - b.radius - e.size/2 < 1) {
                score += 10;
                document.getElementById('score').innerText = score;
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break;
            }
        }
    }
}

setTimeout(spawnHealthPack, Math.random() * 10000 + 30000);

document.getElementById('healthBar').style.width = health + '%';

animate();