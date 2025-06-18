// 2D Platform Shooter Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let coins = 0;
let gunLevel = 1;
let gunUpgradeLevel = 1;
let bullets = [];
let zombies = [];
let lastZombieSpawn = 0;
let keys = {};
let playerHP = 100;
let gameOver = false;
let difficulty = 'medium';
let playerHitFlash = 0;

const player = {
    x: 60,
    y: canvas.height / 2,
    width: 50,
    height: 70,
    speed: 5,
    color: '#4af',
};

const zombieImg = new Image();
zombieImg.src = 'zombie.png';
const toughZombieImg = new Image();
toughZombieImg.src = 'tough_zombie.png';

let zombieBaseSpeed = 0.7;
let zombieSpeedIncrease = 0.02; // Speed increase per 10 coins
let maxBullets = 10;
let bulletsLeft = 10;
let reloading = false;
let reloadTime = 1000; // 1 second
let reloadTimeout = null;

const playerImgs = [
    new Image(), // index 0 unused
    new Image(), // level 1
    new Image(), // level 2
    new Image()  // level 3
];
playerImgs[1].src = 'player1.png';
playerImgs[2].src = 'player2.png';
playerImgs[3].src = 'player3.png';

function drawPlayer() {
    // Draw ammo bar above player
    const ammoBarWidth = 60;
    const ammoBarHeight = 10;
    const ammoX = player.x - 10;
    const ammoY = player.y - 20;
    ctx.fillStyle = '#222';
    ctx.fillRect(ammoX, ammoY, ammoBarWidth, ammoBarHeight);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(ammoX, ammoY, ammoBarWidth * (bulletsLeft / maxBullets), ammoBarHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(ammoX, ammoY, ammoBarWidth, ammoBarHeight);
    if (reloading) {
        ctx.fillStyle = '#ff0';
        ctx.font = '18px Arial';
        ctx.fillText('RELOADING...', player.x + 10, ammoY - 10);
    }
    // Draw player image based on gun level, with red flash if hit
    let imgLevel = gunLevel;
    if (imgLevel > 3) imgLevel = 3;
    if (playerHitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#f00';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.globalAlpha = 1;
        if (playerImgs[imgLevel].complete) {
            ctx.globalAlpha = 0.7;
            ctx.drawImage(playerImgs[imgLevel], player.x, player.y, player.width, player.height);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    } else {
        if (playerImgs[imgLevel].complete) {
            ctx.drawImage(playerImgs[imgLevel], player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }
}

function drawBullets() {
    ctx.fillStyle = gunLevel === 1 ? '#fff' : '#ff0';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawZombies() {
    zombies.forEach(zombie => {
        if (zombie.tough) {
            if (toughZombieImg.complete) {
                ctx.drawImage(toughZombieImg, zombie.x, zombie.y, zombie.width, zombie.height);
            } else {
                ctx.fillStyle = '#a00';
                ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
            }
        } else {
            if (zombieImg.complete) {
                ctx.drawImage(zombieImg, zombie.x, zombie.y, zombie.width, zombie.height);
            } else {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
            }
        }
    });
}

function drawHPBar() {
    // Draw HP bar at fixed top position
    const barWidth = 200;
    const barHeight = 18;
    const x = 20;
    const y = 15;
    ctx.fillStyle = '#800';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#f00';
    ctx.fillRect(x, y, barWidth * (playerHP / 100), barHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('HP: ' + playerHP, x + 70, y + 14);
}

function updatePlayer() {
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y + player.height < canvas.height) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x + player.width < canvas.width) player.x += player.speed;
}

function updateBullets() {
    bullets.forEach(bullet => {
        bullet.x += bullet.speed;
    });
    // Remove off-screen bullets
    bullets = bullets.filter(bullet => bullet.x < canvas.width);
}

function updateZombies() {
    zombies.forEach(zombie => {
        zombie.x -= zombie.speed;
    });
    // Remove zombies that go off-screen and damage player
    zombies = zombies.filter(zombie => {
        if (zombie.x + zombie.width <= 0) {
            playerHP -= 10;
            if (playerHP < 0) playerHP = 0;
            return false;
        }
        return true;
    });
}

function spawnZombie() {
    const y = Math.random() * (canvas.height - 60);
    // 30% chance for a tough zombie (2 hits)
    const isTough = Math.random() < 0.3;
    // Speed increases as coins increase
    let speed = zombieBaseSpeed + (Math.floor(coins / 10) * zombieSpeedIncrease) + Math.random() * 0.7;
    let width = 70;
    let height = 75;
    if (isTough) {
        width = 70;
        height = 100;
        speed = speed * 0.6; // Tough zombies are slower
    }
    zombies.push({
        x: canvas.width - 40,
        y: y,
        width: width,
        height: height,
        speed: speed,
        alive: true,
        hp: isTough ? 2 : 1,
        tough: isTough,
    });
}

function checkCollisions() {
    // Bullet vs zombie
    bullets.forEach((bullet, bIdx) => {
        zombies.forEach((zombie, zIdx) => {
            if (
                bullet.x < zombie.x + zombie.width &&
                bullet.x + bullet.width > zombie.x &&
                bullet.y < zombie.y + zombie.height &&
                bullet.y + bullet.height > zombie.y
            ) {
                // Hit!
                zombie.hp--;
                bullets.splice(bIdx, 1);
                if (zombie.hp <= 0) {
                    zombies.splice(zIdx, 1);
                    coins++;
                    document.getElementById('coinCount').textContent = coins;
                    if (coins === 100 && gunLevel === 1) {
                        gunLevel = 2;
                        document.getElementById('gunLevel').textContent = 'Upgraded!';
                    }
                }
            }
        });
    });
    // Zombie vs player
    zombies.forEach((zombie, zIdx) => {
        if (
            player.x < zombie.x + zombie.width &&
            player.x + player.width > zombie.x &&
            player.y < zombie.y + zombie.height &&
            player.y + player.height > zombie.y
        ) {
            zombies.splice(zIdx, 1);
            playerHP -= 10;
            playerHitFlash = 8;
            if (playerHP < 0) playerHP = 0;
        }
    });
}

function reloadGun() {
    if (!reloading && bulletsLeft < maxBullets) {
        reloading = true;
        reloadTimeout = setTimeout(() => {
            bulletsLeft = maxBullets;
            reloading = false;
        }, reloadTime);
    }
}

function shoot() {
    if (reloading || bulletsLeft <= 0) return;
    const bulletSpeed = gunLevel === 1 ? 10 : 16;
    const bulletWidth = gunLevel === 1 ? 12 : 20;
    const bulletHeight = 6;
    bullets.push({
        x: player.x + player.width + 10,
        y: player.y + player.height / 2 - bulletHeight / 2,
        width: bulletWidth,
        height: bulletHeight,
        speed: bulletSpeed,
    });
    bulletsLeft--;
    if (bulletsLeft === 0) reloadGun();
}

function upgradeGun() {
    gunUpgradeLevel++;
    gunLevel = gunUpgradeLevel;
    if (difficulty === 'easy') {
        maxBullets = 15 + (gunUpgradeLevel - 1) * 5;
    } else if (difficulty === 'medium') {
        maxBullets = 10 + (gunUpgradeLevel - 1) * 5;
    } else if (difficulty === 'hard') {
        maxBullets = 5 + (gunUpgradeLevel - 1) * 5;
    }
    if (!reloading) bulletsLeft = maxBullets;
    document.getElementById('gunLevel').textContent = 'Level ' + gunUpgradeLevel;
}

function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHPBar();
    drawPlayer();
    drawBullets();
    drawZombies();
    updatePlayer();
    updateBullets();
    updateZombies();
    checkCollisions();

    // Spawn zombies every 1-1.5 seconds
    if (!lastZombieSpawn || timestamp - lastZombieSpawn > 1000 + Math.random() * 500) {
        spawnZombie();
        lastZombieSpawn = timestamp;
    }

    // Upgrade gun every 100 coins
    let expectedLevel = Math.floor(coins / 100) + 1;
    if (expectedLevel > gunUpgradeLevel) {
        upgradeGun();
    }

    if (playerHP <= 0) {
        gameOver = true;
        ctx.fillStyle = '#f00';
        ctx.font = '48px Arial';
        ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
        return;
    }

    if (playerHitFlash > 0) playerHitFlash--;

    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if ((e.key === ' ' || e.code === 'Space')) {
        shoot();
    }
    if (e.key === 'r' || e.key === 'R') {
        reloadGun();
    }
});
document.addEventListener('keyup', e => {
    keys[e.key] = false;
});

document.getElementById('coinCount').textContent = coins;
document.getElementById('gunLevel').textContent = 'Level 1';

window.onload = function() {
    const diffSelect = document.getElementById('difficulty');
    const startBtn = document.getElementById('startGameBtn');
    const gameCanvas = document.getElementById('gameCanvas');
    const uiDiv = document.getElementById('ui');
    startBtn.onclick = function() {
        difficulty = diffSelect.value;
        document.getElementById('difficulty-select').style.display = 'none';
        gameCanvas.style.display = '';
        uiDiv.style.display = '';
        applyDifficulty();
        requestAnimationFrame(gameLoop);
    };
};

function applyDifficulty() {
    if (difficulty === 'easy') {
        zombieBaseSpeed = 0.4;
        zombieSpeedIncrease = 0.01;
        maxBullets = 15 + (gunUpgradeLevel - 1) * 5;
        if (!reloading) bulletsLeft = maxBullets;
    } else if (difficulty === 'medium') {
        zombieBaseSpeed = 0.7;
        zombieSpeedIncrease = 0.02;
        maxBullets = 10 + (gunUpgradeLevel - 1) * 5;
        if (!reloading) bulletsLeft = maxBullets;
    } else if (difficulty === 'hard') {
        zombieBaseSpeed = 1.1;
        zombieSpeedIncrease = 0.04;
        maxBullets = 5 + (gunUpgradeLevel - 1) * 5;
        if (!reloading) bulletsLeft = maxBullets;
    }
}
