const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- AUDIO SYNTHESIZER (No MP3s needed!) ---
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
        osc.start(audioCtx.currentTime); 
        osc.stop(audioCtx.currentTime + 0.1);
    } 
    else if (type === 'demon') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2); 
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start(audioCtx.currentTime); 
        osc.stop(audioCtx.currentTime + 0.2);
    } 
    else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3); 
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); 
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- LOAD IMAGES ---
const p1Img = new Image(); 
p1Img.src = 'assets/superman.png';

const p2Img = new Image(); 
p2Img.src = 'assets/demon.png';

// --- GAME VARIABLES ---
let gameActive = true;
const keys = {};
let bullets = [];

const p1 = { 
    x: canvas.width * 0.2, 
    y: canvas.height / 2, 
    radius: 25, 
    speed: 7, 
    health: 100, 
    color: '#00ffcc', 
    canShoot: true 
};

const p2 = { 
    x: canvas.width * 0.8, 
    y: canvas.height / 2, 
    radius: 25, 
    speed: 7, 
    health: 100, 
    color: '#ff4d4d', 
    canShoot: true 
};

// --- INPUT LISTENERS ---
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// --- MAIN GAME LOOP ---
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    ctx.fillStyle = 'rgba(11, 11, 26, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- MOVEMENT: Superman (WASD) ---
    if (keys['w'] || keys['W']) p1.y -= p1.speed;
    if (keys['s'] || keys['S']) p1.y += p1.speed;
    if (keys['a'] || keys['A']) p1.x -= p1.speed;
    if (keys['d'] || keys['D']) p1.x += p1.speed;

    p1.x = Math.max(p1.radius, Math.min(canvas.width - p1.radius, p1.x));
    p1.y = Math.max(p1.radius, Math.min(canvas.height - p1.radius, p1.y));

    // --- MOVEMENT: Demon (ARROWS) ---
    if (keys['ArrowUp']) p2.y -= p2.speed;
    if (keys['ArrowDown']) p2.y += p2.speed;
    if (keys['ArrowLeft']) p2.x -= p2.speed;
    if (keys['ArrowRight']) p2.x += p2.speed;

    p2.x = Math.max(p2.radius, Math.min(canvas.width - p2.radius, p2.x));
    p2.y = Math.max(p2.radius, Math.min(canvas.height - p2.radius, p2.y));

    // 4. SHOOTING: Superman (SPACEBAR)
    if (keys[' '] && p1.canShoot) {
        p1.canShoot = false;
        playSound('superman');
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); 
        bullets.push({ 
            x: p1.x, y: p1.y, 
            velX: Math.cos(angle) * 15, velY: Math.sin(angle) * 15, 
            radius: 6, color: p1.color, owner: 'p1' 
        });
        setTimeout(() => p1.canShoot = true, 350); 
    }

    // 5. SHOOTING: Demon (ENTER)
    if (keys['Enter'] && p2.canShoot) {
        p2.canShoot = false;
        playSound('demon');
        const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        bullets.push({ 
            x: p2.x, y: p2.y, 
            velX: Math.cos(angle) * 15, velY: Math.sin(angle) * 15, 
            radius: 6, color: p2.color, owner: 'p2' 
        });
        setTimeout(() => p2.canShoot = true, 350);
    }

    // 6. DRAW PLAYERS
    if (p1Img.complete && p1Img.naturalHeight !== 0) {
        ctx.drawImage(p1Img, p1.x - 30, p1.y - 30, 60, 60);
    } else {
        ctx.fillStyle = p1.color; 
        ctx.beginPath(); 
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI*2); 
        ctx.fill();
    }

    if (p2Img.complete && p2Img.naturalHeight !== 0) {
        ctx.drawImage(p2Img, p2.x - 30, p2.y - 30, 60, 60);
    } else {
        ctx.fillStyle = p2.color; 
        ctx.beginPath(); 
        ctx.arc(p2.x, p2.y, p2.radius, 0, Math.PI*2); 
        ctx.fill();
    }

    // 7. UPDATE BULLETS & CHECK COLLISIONS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.velX; 
        b.y += b.velY;

        ctx.shadowBlur = 10; 
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

        if (b.owner === 'p2' && Math.hypot(p1.x - b.x, p1.y - b.y) - p1.radius - b.radius < 1) {
            bullets.splice(i, 1); 
            p1.health -= 10;
            document.getElementById('health-p1').innerText = p1.health;
            playSound('hit'); 
            checkWin(); 
            continue;
        }

        if (b.owner === 'p1' && Math.hypot(p2.x - b.x, p2.y - b.y) - p2.radius - b.radius < 1) {
            bullets.splice(i, 1); 
            p2.health -= 10;
            document.getElementById('health-p2').innerText = p2.health;
            playSound('hit'); 
            checkWin();
        }
    }
}

function checkWin() {
    if (p1.health <= 0 || p2.health <= 0) {
        gameActive = false;
        const screen = document.getElementById('gameOverScreen');
        const text = document.getElementById('winnerText');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        screen.style.display = 'block';
        
        if (p1.health <= 0 && p2.health <= 0) {
            text.innerText = "IT'S A DRAW!";
            text.style.color = "white";
        } else if (p2.health <= 0) {
            text.innerText = "SUPERMAN WINS!";
            text.style.color = "#00ffcc";
        } else {
            text.innerText = "DEMON WINS!";
            text.style.color = "#ff4d4d";
        }
    }
}

// Start the game!
animate();