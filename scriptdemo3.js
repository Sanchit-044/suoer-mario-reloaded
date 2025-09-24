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
            this.vel.y = -15;
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
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.image = image || null;
        this.position = { x: this.x, y: this.y };
        this.width = this.w;
        this.height = this.h;
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
            if (player.vel.y > 0) {
                player.pos.y = this.y - player.height;
                player.vel.y = 0;
                player.grounded = true;
            }
        }
    }
}

class Coin {
    constructor(x, y, size = 24, image = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.image = image;
        this.collected = false;
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
    constructor(x, y, w = 32, h = 32, image = null, speed = 1.2) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.image = image;
        this.speed = speed;
        this.dir = -1;
        this.alive = true;
        this.patrolRange = 120;
        this.originX = x;
    }
    update() {
        if (!this.alive) return;
        this.x += this.speed * this.dir;
        if (this.x < this.originX - this.patrolRange / 2) this.dir = 1;
        if (this.x > this.originX + this.patrolRange / 2) this.dir = -1;
    }
    draw(ctx) {
        if (!this.alive) return;
        if (this.image) ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
        else {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
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
    if (e.key === 'a') keys.left = true;
    if (e.key === 'd') keys.right = true;
    if (e.key === 'w') keys.up = true;
});
window.addEventListener('keyup', e => {
    if (e.key === 'a') keys.left = false;
    if (e.key === 'd') keys.right = false;
    if (e.key === 'w') keys.up = false;
});

let player, platforms = [], marioSprite, platformImg, coinImg, enemyImg;
let coins = [], enemies = [];
let scrollOffset = 0, score = 0, lives = 3, lastTime = 0;

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

function buildPlatforms(img) {
    return PLATFORM_DEFS.map(def => {
        const [x, y, w, h] = def;
        return new Platform(x, y, w, h, img);
    });
}

function buildCoinsAndEnemies(cImgParam, eImgParam) {
    const coinList = [[120, 440], [420, 440], [680, 440], [1100, 160], [1250, 260], [2500, 200], [2320, 270], [3000, 190], [3600, 120]]
        .map(([x, y]) => new Coin(x, y, 24, cImgParam));
    const enemyList = [new Enemy(520, 440, 32, 32, eImgParam, 1.0), new Enemy(1800, 320, 32, 32, eImgParam, 1.2),
        new Enemy(2800, 440, 32, 32, eImgParam, 0.9), new Enemy(3400, 300, 32, 32, eImgParam, 1.1)];
    return { coinList, enemyList };
}

function reset(fullReset = false) {
    if (fullReset) { score = 0; lives = 3; }
    if (!player) player = new Player(marioSprite);
    player.pos.x = 100;
    player.pos.y = 100;
    player.vel.x = 0;
    player.vel.y = 0;
    player.grounded = false;
    player.facing = 1;
    player.animFrame = 0;
    player.lastFrameTime = 0;
    player.invincibleUntil = 0;

    scrollOffset = 0;
    platforms = buildPlatforms(platformImg);
    const { coinList, enemyList } = buildCoinsAndEnemies(coinImg, enemyImg);
    coins = coinList;
    enemies = enemyList;
    console.log('Reset (respawn). Score:', score, 'Lives:', lives);
}

// New restart function for pit/fall
function restart() {
    player.pos.x = 100;
    player.pos.y = 100;
    player.vel.x = 0;
    player.vel.y = 0;
    player.grounded = false;
    player.facing = 1;
    player.animFrame = 0;
    player.lastFrameTime = 0;
    player.invincibleUntil = 0;
    scrollOffset = 0;
    platforms = buildPlatforms(platformImg);
    const built = buildCoinsAndEnemies(coinImg, enemyImg);
    coins = built.coinList;
    enemies = built.enemyList;
    console.log('Player fell into a pit. Respawned.');
}

// Asset loading and game start
Promise.all([
    loadImage('./characters.gif').catch(() => null),
    loadImage('./platform.jpg').catch(() => null),
    loadImage('./coin.png').catch(() => null),
    loadImage('./enemy.png').catch(() => null)
]).then(([charsImg, platImg, cImg, eImg]) => {
    marioSprite = new SpriteSheet(charsImg || new Image(), 16, 16);
    platformImg = platImg; coinImg = cImg; enemyImg = eImg;

    try {
        marioSprite.define("idle", 276, 44, 16, 16);
        marioSprite.define("walk1", 292, 44, 16, 16);
        marioSprite.define("walk2", 308, 44, 16, 16);
        marioSprite.define("walk3", 324, 44, 16, 16);
        marioSprite.define("jump", 340, 44, 16, 16);
    } catch (e) { }

    player = new Player(marioSprite);
    platforms = buildPlatforms(platformImg);
    const built = buildCoinsAndEnemies(coinImg, enemyImg);
    coins = built.coinList;
    enemies = built.enemyList;

    requestAnimationFrame(loop);
}).catch(err => {
    console.error('Asset loading error:', err);
    player = new Player(null);
    platformImg = null;
    coins = [];
    enemies = [];
    platforms = buildPlatforms(null);
    requestAnimationFrame(loop);
});

function loop(now = 0) {
    const deltaTime = now - (lastTime || now);
    lastTime = now;

    c.fillStyle = 'skyblue';
    c.fillRect(0, 0, canvas.width, canvas.height);

    player.vel.x = 0;
    if (keys.right && player.pos.x < 400) {
        player.vel.x = player.speed;
        player.facing = 1;
    } else if (keys.left && player.pos.x > 100) {
        player.vel.x = -player.speed;
        player.facing = -1;
    } else {
        player.vel.x = 0;
        if (keys.right) {
            scrollOffset += player.speed;
            platforms.forEach(p => { p.x -= player.speed; p.position.x = p.x; });
            coins.forEach(c => c.x -= player.speed);
            enemies.forEach(e => { e.x -= player.speed; e.originX -= player.speed; });
            player.facing = 1;
        } else if (keys.left) {
            scrollOffset -= player.speed;
            platforms.forEach(p => { p.x += player.speed; p.position.x = p.x; });
            coins.forEach(c => c.x += player.speed);
            enemies.forEach(e => { e.x += player.speed; e.originX += player.speed; });
            player.facing = -1;
        }
    }

    if (keys.up) player.jump();
    player.update(deltaTime, now);
    platforms.forEach(p => p.collide(player));

    coins.forEach(coin => { if (!coin.collected && coin.collect(player)) { score += 100; player.vel.y = -6; } });

    enemies.forEach(enemy => {
        enemy.update();
        const col = enemy.checkCollision(player);
        if (col === 'stomp') {
            enemy.alive = false;
            score += 250;
            player.vel.y = -10;
        } else if (col === 'hit') {
            if (!player.isInvincible(now)) {
                lives -= 1;
                console.log('Player hit! Lives left:', lives);
                if (lives <= 0) reset(true);
                else player.makeInvincible(1500);
            }
        }
    });

    platforms.forEach(p => p.draw(c));
    coins.forEach(coin => coin.draw(c));
    enemies.forEach(e => e.draw(c));
    player.draw(c, now);

    c.font = '20px Arial';
    c.fillStyle = 'black';
    c.fillText('Score: ' + score, 16, 28);
    c.fillText('Lives: ' + lives, 16, 56);

    // Check for game win
    if (scrollOffset > 4700) {
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.fillStyle = 'white';
        c.font = '48px Arial';
        c.fillText('YOU WIN!', canvas.width / 2 - 120, canvas.height / 2);
        return;
    }

    // Death pit / fall off screen
    if (player.pos.y + player.height >= canvas.height) {
        if (!player.isInvincible(now)) {
            lives -= 1;
            console.log('Player fell! Lives left:', lives);
            if (lives <= 0) reset(true);
            else {
                restart();
                player.makeInvincible(1500);
            }
        }
    }

    requestAnimationFrame(loop);
}
