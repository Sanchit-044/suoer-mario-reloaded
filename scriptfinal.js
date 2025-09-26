const canvas = document.getElementById('screen');
const c = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 576;


function loadImage(url) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('Image load failed: ' + url));
        img.src = url;
    });
}

class SpriteSheet {
    constructor(image, tileW, tileH) {
        this.image = image;
        this.tileW = tileW;
        this.tileH = tileH;
        this.tiles = new Map();
    }
    define(name, sx, sy, w = this.tileW, h = this.tileH) {
        const buf = document.createElement('canvas');
        buf.width = w;
        buf.height = h;
        buf.getContext('2d').drawImage(this.image, sx, sy, w, h, 0, 0, w, h);
        this.tiles.set(name, buf);
    }
    draw(name, ctx, x, y, scale = 2) {
        const buf = this.tiles.get(name);
        if (!buf) return;
        ctx.drawImage(buf, x, y, buf.width * scale, buf.height * scale);
    }
}

class Player {
    constructor(sprite) {
        this.sprite = sprite;
        this.pos = { x: 100, y: 100 };
        this.vel = { x: 0, y: 0 };
        this.width = 32;
        this.height = 32;
        this.gravity = 0.8;
        this.grounded = false;
        this.facing = 1;
        this.animFrame = 0;
        this.frameInterval = 120;
        this.lastFrameTime = 0;
        this.speed = 5;
        this.idleHold = 0;
        this.invincibleUntil = 0;
    }
    update(deltaTime, now) {
        this.vel.y += this.gravity;
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        if (this.pos.y + this.height > canvas.height) {
            this.pos.y = canvas.height - this.height;
            this.vel.y = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
        if (this.invincibleUntil && now > this.invincibleUntil) this.invincibleUntil = 0;
    }
    draw(ctx, now) {
        if (this.invincibleUntil && Math.floor(now / 100) % 2 === 0) return;

        let frame = "idle";
        if (!this.grounded) frame = "jump";
        else if (Math.abs(this.vel.x) > 0.5 || keys.left || keys.right) {
            if (now - this.lastFrameTime > this.frameInterval) {
                this.animFrame = (this.animFrame + 1) % 3;
                this.lastFrameTime = now;
            }
            frame = ["walk1", "walk2", "walk3"][this.animFrame];
        } else {
            if (this.idleHold < 1) this.idleHold++;
            else this.animFrame = 0;
            frame = "idle";
        }

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(this.pos.x + this.width, 0);
            ctx.scale(-1, 1);
            this.sprite.draw(frame, ctx, 0, this.pos.y, 2);
        } else {
            this.sprite.draw(frame, ctx, this.pos.x, this.pos.y, 2);
        }
        ctx.restore();
    }
    jump() {
        if (this.grounded) {
            // play jump sound
            if (jumpSound) {
                try { jumpSound.currentTime = 0; jumpSound.play(); } catch (e) { /* ignore */ }
            }
            this.vel.y = -18;
            this.grounded = false;
        }
    }
    makeInvincible(ms = 1000) {
        this.invincibleUntil = performance.now() + ms;
    }
    isInvincible(now = performance.now()) {
        return this.invincibleUntil && now < this.invincibleUntil;
    }
}

class Platform {
    constructor(x, y, w, h, image) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.image = image || null;
        this.position = { x: this.x, y: this.y };
        this.width = this.w; this.height = this.h;
    }
    draw(ctx) {
        if (this.image) ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
        else {
            ctx.fillStyle = "sienna";
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
    collide(player) {
        if (player.pos.x < this.x + this.w &&
            player.pos.x + player.width > this.x &&
            player.pos.y < this.y + this.h &&
            player.pos.y + player.height > this.y) {

            const overlapX = (player.width / 2 + this.w / 2) -
                Math.abs((player.pos.x + player.width / 2) - (this.x + this.w / 2));
            const overlapY = (player.height / 2 + this.h / 2) -
                Math.abs((player.pos.y + player.height / 2) - (this.y + this.h / 2));

            if (overlapX < overlapY) {
                if (player.pos.x < this.x) player.pos.x = this.x - player.width;
                else player.pos.x = this.x + this.w;
                player.vel.x = 0;
            } else {
                if (player.pos.y < this.y) {
                    player.pos.y = this.y - player.height;
                    player.vel.y = 0;
                    player.grounded = true;
                } else {
                    player.pos.y = this.y + this.h;
                    if (player.vel.y < 0) player.vel.y = 0;
                }
            }
        }
    }
}

class Coin {
    constructor(x, y, size = 24, image = null) {
        this.x = x; this.y = y; this.size = size;
        this.image = image; this.collected = false;
    }
    draw(ctx) {
        if (this.collected) return;
        if (this.image) ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
        else {
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    collect(player) {
        if (this.collected) return false;
        const px = player.pos.x, py = player.pos.y, pw = player.width, ph = player.height;
        if (px < this.x + this.size && px + pw > this.x &&
            py < this.y + this.size && py + ph > this.y) {
            this.collected = true;
            return true;
        }
        return false;
    }
}

class Enemy {
    constructor(x, y, w = 32, h = 32, image = null, speed = 1.2, deadImage = null) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.image = image; this.deadImage = deadImage;
        this.speed = speed; this.dir = -1;
        this.alive = true; this.patrolRange = 120; this.originX = x;
        this.deadTime = 0; this.removed = false;
    }
    update(now) {
        if (!this.alive) {
            if (now - this.deadTime > 1000) this.removed = true;
            return;
        }
        this.x += this.speed * this.dir;
        if (this.x < this.originX - this.patrolRange / 2) this.dir = 1;
        if (this.x > this.originX + this.patrolRange / 2) this.dir = -1;
    }
    draw(ctx) {
        if (this.removed) return;
        if (!this.alive) {
            if (this.deadImage) ctx.drawImage(this.deadImage, this.x, this.y, this.w, this.h);
            return;
        }
        if (this.image) ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
        else {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
    kill(now) {
        this.alive = false;
        this.deadTime = now;
    }
    checkCollision(player) {
        if (!this.alive) return null;
        const px = player.pos.x, py = player.pos.y, pw = player.width, ph = player.height;
        if (px < this.x + this.w &&
            px + pw > this.x &&
            py < this.y + this.h &&
            py + ph > this.y) {
            const isStomp = player.vel.y > 0 && (player.pos.y + player.height - this.y < 12);
            if (isStomp) return 'stomp';
            return 'hit';
        }
        return null;
    }
}

const keys = { left: false, right: false, up: false };
window.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;

    if (levelComplete) {
        if (e.key.toLowerCase() === 'r') {
            if (currentLevel === 2) currentLevel = 1;
            reset(true);
        }
        if (e.key.toLowerCase() === 'n' && currentLevel === 1) {
            currentLevel = 2;
            reset(false);
        }
    }
});
window.addEventListener('keyup', e => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
});

let player, platforms = [], marioSprite, platformImg, coinImg, enemyImg, enemyDeadImg, cloudsImg;
// AUDIO variables
let groundTheme = null;
let coinSound = null;
let jumpSound = null;
let winSound = null;
let playedWinSound = false;

let coins = [], enemies = [];
let clouds = [];
let scrollOffset = 0, score = 0, lives = 3, lastTime = 0;
let currentLevel = 1;
let levelComplete = false;

// level 1
const PLATFORM_DEFS = [
    [-1, 480, 300, 100], [300, 480, 300, 100], [596, 480, 300, 100], [1000, 480, 300, 100],
    [1300, 480, 300, 100], [1600, 480, 300, 100], [2000, 480, 300, 100], [2300, 480, 300, 100],
    [2600, 480, 300, 100], [2900, 480, 300, 100], [3400, 480, 300, 100], [3700, 480, 300, 100],
    [4000, 480, 300, 100], [4400, 480, 300, 100], [4700, 480, 300, 100], [5000, 480, 300, 100],
    [200, 300, 300, 50], [550, 200, 300, 50], [850, 120, 150, 40], [1100, 200, 100, 40], [1200, 300, 200, 40],
    [2500, 250, 200, 40], [2100, 230, 150, 40], [1700, 360, 200, 40], [2300, 310, 160, 40], [2700, 400, 90, 30],
    [3000, 230, 130, 40], [3500, 350, 100, 40], [3900, 170, 70, 30], [4400, 330, 130, 50], [4400, 230, 160, 40],
    [4700, 350, 250, 60], [3300, 350, 160, 40], [3600, 170, 170, 50], [4000, 330, 140, 40]
];
function buildPlatforms(img) { return PLATFORM_DEFS.map(def => new Platform(...def, img)); }
function buildCoinsAndEnemies(cImgParam, eImgParam, eDeadImgParam) {
    const coinList = [[120, 440], [420, 440], [680, 440], [1100, 160], [1250, 260], [2500, 200], [2320, 270], [3000, 190], [3600, 120]]
        .map(([x, y]) => new Coin(x, y, 24, cImgParam));
    const enemyList = [
        new Enemy(520, 452, 32, 32, eImgParam, 1.0, eDeadImgParam),
        new Enemy(1800, 332, 32, 32, eImgParam, 1.2, eDeadImgParam),
        new Enemy(2800, 450, 32, 32, eImgParam, 0.9, eDeadImgParam),
        new Enemy(3400, 322, 32, 32, eImgParam, 1.1, eDeadImgParam)
    ];
    return { coinList, enemyList };
}

// level 2
const PLATFORM_DEFS_LEVEL2 = [
    [0, 480, 400, 100], [500, 380, 200, 40], [800, 300, 200, 40], [1200, 250, 200, 40],
    [1600, 350, 250, 50], [2000, 250, 150, 40], [2300, 400, 200, 50],
    [2700, 320, 200, 40], [3100, 200, 200, 40], [3500, 120, 200, 40],
    [3900, 250, 250, 50], [4400, 400, 300, 60], [4900, 280, 200, 40]
];
function buildCoinsAndEnemiesLevel2(cImgParam, eImgParam, eDeadImgParam) {
    const coinList = [
        [150, 420], [550, 340], [850, 260], [1250, 160], [1650, 300],
        [2050, 200], [2350, 350], [2750, 270], [3150, 150], [3550, 80],
        [3950, 200], [4450, 350], [4950, 230]
    ].map(([x, y]) => new Coin(x, y, 24, cImgParam));

    const enemyList = [
        new Enemy(600, 352, 32, 32, eImgParam, 1.2, eDeadImgParam),
        new Enemy(1300, 222, 32, 32, eImgParam, 1.4, eDeadImgParam),
        new Enemy(1700, 322, 32, 32, eImgParam, 1.0, eDeadImgParam),
        new Enemy(2400, 372, 32, 32, eImgParam, 1.3, eDeadImgParam),
        new Enemy(2800, 292, 32, 32, eImgParam, 0.8, eDeadImgParam),
        new Enemy(3600, 92, 32, 32, eImgParam, 1.1, eDeadImgParam),
        new Enemy(4100, 222, 32, 32, eImgParam, 1.0, eDeadImgParam)
    ];
    return { coinList, enemyList };
}

function reset(fullReset = false) {
    if (fullReset) { score = 0; lives = 3; }
    if (!player) player = new Player(marioSprite);

    player.pos.x = 100; player.pos.y = 100;
    player.vel.x = 0; player.vel.y = 0;
    player.grounded = false; player.facing = 1;
    player.animFrame = 0; player.lastFrameTime = 0; player.invincibleUntil = 0;

    scrollOffset = 0; levelComplete = false;

    if (currentLevel === 1) {
        platforms = buildPlatforms(platformImg);
        const { coinList, enemyList } = buildCoinsAndEnemies(coinImg, enemyImg, enemyDeadImg);
        coins = coinList; enemies = enemyList;
    } else {
        platforms = PLATFORM_DEFS_LEVEL2.map(def => new Platform(...def, platformImg));
        const { coinList, enemyList } = buildCoinsAndEnemiesLevel2(coinImg, enemyImg, enemyDeadImg);
        coins = coinList; enemies = enemyList;
    }

    generateClouds();

    // play/pause ground theme based on level
    playedWinSound = false;
    if (groundTheme) {
        if (currentLevel === 1) {
            try { groundTheme.currentTime = 0; groundTheme.play(); } catch(e) { /* ignore autoplay blocks */ }
        } else {
            groundTheme.pause();
            groundTheme.currentTime = 0;
        }
    }

    console.log(`Reset Level ${currentLevel}. Score:`, score, 'Lives:', lives);
}

function restart() {
    reset(false);
}

Promise.all([
    loadImage('./characters.gif').catch(() => null),
    loadImage('./platform.jpg').catch(() => null),
    loadImage('./coins.png').catch(() => null),
    loadImage('./enemy.png').catch(() => null),
    loadImage('./enemydead.png').catch(() => null),
    loadImage('./clouds.png').catch(() => null)
]).then(([charsImg, platImg, cImg, eImg, eDeadImg, clImg]) => {
    marioSprite = new SpriteSheet(charsImg || new Image(), 16, 16);
    platformImg = platImg;
    coinImg = cImg;
    enemyImg = eImg;
    enemyDeadImg = eDeadImg;
    cloudsImg = clImg;

    // create audio objects (files must be in same folder)
    try {
        groundTheme = new Audio('./groundtheme.mp3');
        groundTheme.loop = true;
        groundTheme.volume = 0.45;
    } catch (e) { groundTheme = null; }

    try {
        coinSound = new Audio('./coinpick.wav');
        coinSound.volume = 0.9;
    } catch (e) { coinSound = null; }

    try {
        jumpSound = new Audio('./jump.wav');
        jumpSound.volume = 0.9;
    } catch (e) { jumpSound = null; }

    try {
        winSound = new Audio('./winwin.wav');
        winSound.volume = 0.9;
    } catch (e) { winSound = null; }

    try {
        marioSprite.define("idle", 276, 44, 16, 16);
        marioSprite.define("walk1", 289.5, 44, 16, 16);
        marioSprite.define("walk2", 305.5, 44, 16, 16);
        marioSprite.define("walk3", 321.5, 44, 16, 16);
        marioSprite.define("jump", 337.5, 44, 16, 16);
    } catch (err) { console.warn("Sprite define failed:", err); }

    reset(true);
    requestAnimationFrame(loop);
}).catch(err => {
    console.error('Asset loading failed:', err);
    requestAnimationFrame(loop);
});

//clouds

const CLOUDS_COUNT = 12;
const CLOUD_MIN_Y = 10;
const CLOUD_MAX_Y = 180;
const CLOUD_PLATFORM_MARGIN = 50;
const CLOUD_MIN_SCALE = 0.9;
const CLOUD_MAX_SCALE = 1.4;

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function computeWorldWidth() {
    if (!platforms || platforms.length === 0) return 5200;
    let mx = 0;
    platforms.forEach(p => { mx = Math.max(mx, p.x + p.w); });
    return mx + 800;
}

function generateClouds() {
    clouds = [];
    const worldW = computeWorldWidth();

    const baseW = (cloudsImg && cloudsImg.width) ? cloudsImg.width : 300;
    const baseH = (cloudsImg && cloudsImg.height) ? cloudsImg.height : 120;

    let placed = 0;
    let attempts = 0;
    const maxAttempts = CLOUDS_COUNT * 25;

    while (placed < CLOUDS_COUNT && attempts < maxAttempts) {
        attempts++;
        const scale = CLOUD_MIN_SCALE + Math.random() * (CLOUD_MAX_SCALE - CLOUD_MIN_SCALE);
        const cw = baseW * scale;
        const ch = baseH * scale;

        const cx = Math.floor(Math.random() * Math.max(800, worldW));
        const cy = Math.floor(CLOUD_MIN_Y + Math.random() * (CLOUD_MAX_Y - CLOUD_MIN_Y));

        let bad = false;
        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            const px = p.x - CLOUD_PLATFORM_MARGIN;
            const py = p.y - CLOUD_PLATFORM_MARGIN;
            const pw = p.w + CLOUD_PLATFORM_MARGIN * 2;
            const ph = p.h + CLOUD_PLATFORM_MARGIN * 2;
            if (rectsOverlap(cx, cy, cw, ch, px, py, pw, ph)) {
                bad = true;
                break;
            }
        }
        if (bad) continue;

        for (let j = 0; j < clouds.length; j++) {
            const o = clouds[j];
            if (rectsOverlap(cx - 60, cy - 30, cw + 120, ch + 60, o.x, o.y, o.w, o.h)) {
                bad = true;
                break;
            }
        }
        if (bad) continue;

        clouds.push({ x: cx, y: cy, w: cw, h: ch, scale });
        placed++;
    }

    let fallbackAttempts = 0;
    while (clouds.length < CLOUDS_COUNT && fallbackAttempts < 200) {
        fallbackAttempts++;
        const scale = CLOUD_MIN_SCALE + Math.random() * (CLOUD_MAX_SCALE - CLOUD_MIN_SCALE);
        const cw = baseW * scale;
        const ch = baseH * scale;
        const cx = Math.floor(Math.random() * Math.max(800, worldW));
        const cy = Math.floor(CLOUD_MIN_Y + Math.random() * (CLOUD_MAX_Y - CLOUD_MIN_Y));

        let bad = false;
        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            const px = p.x - CLOUD_PLATFORM_MARGIN;
            const py = p.y - CLOUD_PLATFORM_MARGIN;
            const pw = p.w + CLOUD_PLATFORM_MARGIN * 2;
            const ph = p.h + CLOUD_PLATFORM_MARGIN * 2;
            if (rectsOverlap(cx, cy, cw, ch, px, py, pw, ph)) {
                bad = true;
                break;
            }
        }
        if (!bad) clouds.push({ x: cx, y: cy, w: cw, h: ch, scale });
    }
}

function drawClouds(ctx) {
    if (!clouds || clouds.length === 0) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#cfefff';
        for (let i = 0; i < 6; i++) {
            const x = (i * 300) - (scrollOffset * 0.25 % 300);
            ctx.beginPath();
            ctx.ellipse(x + 120, 90 + (i % 2) * 20, 80, 30, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    const parallax = 0.25;
    ctx.save();
    for (let i = 0; i < clouds.length; i++) {
        const cl = clouds[i];
        const screenX = (cl.x - scrollOffset * parallax);
        const screenY = cl.y;
        if (screenX + cl.w < -200 || screenX > canvas.width + 200) continue;

        if (cloudsImg) {
            ctx.drawImage(cloudsImg, screenX, screenY, cl.w, cl.h);
        } else {
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.ellipse(screenX + cl.w / 2, screenY + cl.h / 2, cl.w / 2, cl.h / 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#e6f7ff';
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    ctx.restore();
}
//game loop
function loop(now) {
    const deltaTime = now - lastTime;
    lastTime = now;
    c.clearRect(0, 0, canvas.width, canvas.height);

    if (!player) return;

    player.vel.x = 0;
    if (keys.left) { player.vel.x = -player.speed; player.facing = -1; }
    if (keys.right) { player.vel.x = player.speed; player.facing = 1; }
    if (keys.up) { player.jump(); keys.up = false; }

    player.update(deltaTime, now);

    platforms.forEach(p => { p.collide(player); });
    scrollOffset = Math.max(0, player.pos.x - 150);

    drawClouds(c);

    c.save();
    c.translate(-scrollOffset, 0);

    platforms.forEach(p => p.draw(c));

    coins.forEach(cn => {
        if (cn.collect(player)) {
            score += 100;
            // play coin sound
            if (coinSound) {
                try { coinSound.currentTime = 0; coinSound.play(); } catch(e) { /* ignore */ }
            }
        }
        cn.draw(c);
    });

    enemies.forEach(en => {
        en.update(now);
        if (!en.removed) {
            const col = en.checkCollision(player);
            if (col === 'stomp') {
                en.kill(now);
                player.vel.y = -10;
                score += 200;
            } else if (col === 'hit') {
            if (!player.isInvincible(now)) {
                lives -= 1;
                console.log('Player hit! Lives left:', lives);
                if (lives <= 0) reset(true);
                else player.makeInvincible(1500);
            }
        }
        }
        en.draw(c);
    });

    player.draw(c, now);
    c.restore();

    c.fillStyle = 'black';
    c.font = "12px 'Press Start 2P'";
    c.fillText(`Score: ${score}`, 20, 30);
    c.fillText(`Lives: ${lives}`, 20, 60);

    if (player.pos.x > 5000 && currentLevel === 1) {
        if (!levelComplete) {
            // first frame of completion: pause background and play win once
            if (groundTheme) { groundTheme.pause(); groundTheme.currentTime = 0; }
            if (winSound && !playedWinSound) {
                try { winSound.currentTime = 0; winSound.play(); } catch (e) { /* ignore */ }
                playedWinSound = true;
            }
        }
        levelComplete = true;
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.fillStyle = 'white';
        c.font = "30px 'Press Start 2P'";
        c.fillText('Level 1 Complete!', canvas.width / 2 - 190, canvas.height / 2 - 20);
        c.font = "20px 'Press Start 2P'";
        c.fillText('Press N for Next Level or R to Replay', canvas.width / 2 - 350, canvas.height / 2 + 20);
    } else if (player.pos.x > 5200 && currentLevel === 2) {
        if (!levelComplete) {
            if (groundTheme) { groundTheme.pause(); groundTheme.currentTime = 0; }
            if (winSound && !playedWinSound) {
                try { winSound.currentTime = 0; winSound.play(); } catch (e) { /* ignore */ }
                playedWinSound = true;
            }
        }
        levelComplete = true;
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.fillStyle = 'white';
        c.font = "30px 'Press Start 2P'";
        c.fillText('You Win!', canvas.width / 2 - 80, canvas.height / 2);
    }

    if (player.pos.y + player.height >= canvas.height) {
        lives = 0;
        if (lives <= 0) reset(true);
        else restart();
    }

    if (levelComplete){
        keys.left = keys.right = keys.up = false;
    }

    requestAnimationFrame(loop);
}
