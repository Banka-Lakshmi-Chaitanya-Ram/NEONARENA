const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameStarted = false;
let paused = false;
let gameActive = true;

// START / UI
function startGame(){
    document.getElementById("startScreen").style.display = "none";
    gameStarted = true;
}

function goHome(){
    window.location.href = "index.html";
}

function resumeGame(){
    paused = false;
    document.getElementById("pauseScreen").style.display = "none";
}

function restartGame() {
    location.reload();
}

// PAUSE
window.addEventListener('keydown', (e)=>{
    if(e.key === "Escape" && gameStarted){
        paused = !paused;

        if(paused){
            document.getElementById("pauseScreen").style.display = "block";
        } else {
            document.getElementById("pauseScreen").style.display = "none";
        }
    }
});

// AUDIO
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'superman') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    } 
    else if (type === 'demon') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2); 
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    } 
    else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3); 
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    }

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// IMAGES
const p1Img = new Image(); 
p1Img.src = 'assets/superman.png';

const p2Img = new Image(); 
p2Img.src = 'assets/demon.png';

// GAME DATA
const keys = {};
let bullets = [];

let hitFlashP1 = 0;
let hitFlashP2 = 0;

const p1 = { 
    x: canvas.width * 0.2, 
    y: canvas.height / 2, 
    radius: 25, 
    speed: 7, 
    health: 100, 
    color: '#00ffcc', 
    shootCooldown: 0
};

const p2 = { 
    x: canvas.width * 0.8, 
    y: canvas.height / 2, 
    radius: 25, 
    speed: 7, 
    health: 100, 
    color: '#ff4d4d', 
    shootCooldown: 0
};

// INPUT
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// LOOP
function animate() {
    requestAnimationFrame(animate);

    if (!gameActive || !gameStarted || paused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // MOVEMENT
    if (keys['w'] || keys['W']) p1.y -= p1.speed;
    if (keys['s'] || keys['S']) p1.y += p1.speed;
    if (keys['a'] || keys['A']) p1.x -= p1.speed;
    if (keys['d'] || keys['D']) p1.x += p1.speed;

    if (keys['ArrowUp']) p2.y -= p2.speed;
    if (keys['ArrowDown']) p2.y += p2.speed;
    if (keys['ArrowLeft']) p2.x -= p2.speed;
    if (keys['ArrowRight']) p2.x += p2.speed;

    // BOUNDARIES
    p1.x = Math.max(p1.radius, Math.min(canvas.width - p1.radius, p1.x));
    p1.y = Math.max(p1.radius, Math.min(canvas.height - p1.radius, p1.y));

    p2.x = Math.max(p2.radius, Math.min(canvas.width - p2.radius, p2.x));
    p2.y = Math.max(p2.radius, Math.min(canvas.height - p2.radius, p2.y));

    // PLAYER COLLISION FIX
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    if (dist < p1.radius + p2.radius) {
        const overlap = (p1.radius + p2.radius - dist) / 2;
        const angle = Math.atan2(dy, dx);

        p1.x -= Math.cos(angle) * overlap;
        p1.y -= Math.sin(angle) * overlap;
        p2.x += Math.cos(angle) * overlap;
        p2.y += Math.sin(angle) * overlap;
    }

    // SHOOTING
    if (keys[' '] && p1.shootCooldown <= 0) {
        playSound('superman');
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); 
        bullets.push({ 
            x: p1.x, y: p1.y, 
            velX: Math.cos(angle) * 10, 
            velY: Math.sin(angle) * 10, 
            radius: 6, 
            color: p1.color, 
            owner: 'p1' 
        });
        p1.shootCooldown = 20;
    }

    if (keys['Enter'] && p2.shootCooldown <= 0) {
        playSound('demon');
        const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        bullets.push({ 
            x: p2.x, y: p2.y, 
            velX: Math.cos(angle) * 10, 
            velY: Math.sin(angle) * 10, 
            radius: 6, 
            color: p2.color, 
            owner: 'p2' 
        });
        p2.shootCooldown = 20;
    }

    if (p1.shootCooldown > 0) p1.shootCooldown--;
    if (p2.shootCooldown > 0) p2.shootCooldown--;

    // DRAW PLAYERS
    ctx.drawImage(p1Img, p1.x - 30, p1.y - 30, 60, 60);
    ctx.drawImage(p2Img, p2.x - 30, p2.y - 30, 60, 60);

    // BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.velX; 
        b.y += b.velY;

        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;

        ctx.beginPath(); 
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); 
        ctx.fillStyle = b.color; 
        ctx.fill();

        ctx.shadowBlur = 0;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1); 
            continue;
        }

        if (b.owner === 'p2' && Math.hypot(p1.x - b.x, p1.y - b.y) < p1.radius + b.radius) {
            bullets.splice(i, 1); 
            p1.health = Math.max(0, p1.health - 10);
            hitFlashP1 = 1;
            document.getElementById('health-p1').innerText = p1.health;
            playSound('hit'); 
            checkWin(); 
        }

        if (b.owner === 'p1' && Math.hypot(p2.x - b.x, p2.y - b.y) < p2.radius + b.radius) {
            bullets.splice(i, 1); 
            p2.health = Math.max(0, p2.health - 10);
            hitFlashP2 = 1;
            document.getElementById('health-p2').innerText = p2.health;
            playSound('hit'); 
            checkWin();
        }
    }

    // HIT FLASH
    if (hitFlashP1 > 0) {
        ctx.fillStyle = `rgba(0,255,255,${hitFlashP1 * 0.4})`;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 40, 0, Math.PI * 2);
        ctx.fill();
        hitFlashP1 -= 0.05;
    }

    if (hitFlashP2 > 0) {
        ctx.fillStyle = `rgba(255,0,0,${hitFlashP2 * 0.4})`;
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 40, 0, Math.PI * 2);
        ctx.fill();
        hitFlashP2 -= 0.05;
    }
}

// WIN CHECK
function checkWin() {
    if (p1.health <= 0 || p2.health <= 0) {
        gameActive = false;

        const screen = document.getElementById('gameOverScreen');
        const text = document.getElementById('winnerText');

        screen.style.display = 'block';

        if (p1.health <= 0 && p2.health <= 0) {
            text.innerText = "IT'S A DRAW!";
        } else if (p2.health <= 0) {
            text.innerText = "SUPERMAN WINS!";
            text.style.color = "#00ffcc";
        } else {
            text.innerText = "DEMON WINS!";
            text.style.color = "#ff4d4d";
        }
    }
}

animate();

function showControls() {
    document.getElementById('controlsModal').style.display = 'flex';
}

function closeControls() {
    document.getElementById('controlsModal').style.display = 'none';
}