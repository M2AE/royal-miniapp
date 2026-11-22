// Royal Pixel Odyssey — 60 FPS Procedural Pixel Adventure Engine
import { BIOMES, getBiomeForStage, PET_CONFIGS, SKIN_PALETTES, WEAPON_CONFIGS } from './catalog';
import { pixelAudio } from './audio';
import {
  drawBossSprite,
  drawChest,
  drawCoin,
  drawEnemySprite,
  drawGem,
  drawHeroSprite,
  drawMysteryBlock,
  drawPetSprite,
  drawPowerup,
  drawShrine,
  drawSpring,
  drawTileBlock,
} from './sprites';

export const VIEW_W = 400;
export const VIEW_H = 232;
const GROUND_Y = 192;
const GRAVITY = 690;
const BOSS_INTERVAL_METERS = 380;

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export class PixelOdysseyEngine {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx.imageSmoothingEnabled = false;

    this.onHudUpdate = config.onHudUpdate || (() => {});
    this.onGameOver = config.onGameOver || (() => {});
    this.onHaptic = config.onHaptic || (() => {});

    this.skinId = config.skinId || 'royal_knight';
    this.weaponId = config.weaponId || 'iron_blade';
    this.petId = config.petId || 'none';
    this.upgrades = config.upgrades || {
      max_hp: 0, magnet: 0, greed: 0, dash: 0, crit_mastery: 0, ultimate: 0,
    };

    this.autoRun = Boolean(config.autoRun);
    this.running = false;
    this.paused = false;
    this.rafId = null;
    this.lastFrameTs = 0;
    this.hudTick = 0;

    this.input = { left: false, right: false };
    this._resetState();
  }

  applyLoadout({ skinId, weaponId, petId, upgrades, autoRun }) {
    if (skinId) this.skinId = skinId;
    if (weaponId) this.weaponId = weaponId;
    if (petId !== undefined) this.petId = petId;
    if (upgrades) this.upgrades = upgrades;
    if (autoRun !== undefined) this.autoRun = Boolean(autoRun);
  }

  _resetState() {
    const skin = SKIN_PALETTES[this.skinId] || SKIN_PALETTES.royal_knight;
    const pet = PET_CONFIGS[this.petId] || PET_CONFIGS.none;
    const maxHp = 4 + (this.upgrades.max_hp || 0) + (skin.stats.bonusHp || 0);

    this.time = 0;
    this.startTime = performance.now();
    this.gameOver = false;
    this.stage = 1;
    this.biome = getBiomeForStage(1);
    this.nextBossAt = BOSS_INTERVAL_METERS;

    this.score = 0;
    this.coins = 0;
    this.kills = 0;
    this.lifestealCounter = 0;
    this.bossesDefeated = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.distance = 0;
    this.furthestX = 60;

    this.cameraX = 0;
    this.shakeTimer = 0;
    this.shakeMag = 0;
    this.hitStop = 0;
    this.ultFlash = 0;
    this.bannerText = `مرحله ۱ — ${this.biome.name}`;
    this.bannerTimer = 2.6;

    this.player = {
      x: 64,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      w: 14,
      h: 22,
      facing: 1,
      onGround: true,
      jumpsLeft: 2,
      coyote: 0,
      jumpBuf: 0,
      hp: maxHp,
      maxHp,
      shield: Boolean(pet.stageShield),
      starTimer: 0,
      magnetTimer: 0,
      feverTimer: 0,
      hurtTimer: 0,
      attackCd: 0,
      attackAnim: 0,
      dashCd: 0,
      dashTimer: 0,
      rage: 25,
      afterimages: [],
    };

    this.petState = {
      x: 42,
      y: GROUND_Y - 26,
      fireCd: 1.5,
    };

    // World entities
    this.grounds = [{ x: -80, y: GROUND_Y, w: 460, h: 60 }];
    this.platforms = [];
    this.blocks = [];
    this.chests = [];
    this.springs = [];
    this.shrines = [];
    this.spikes = [];
    this.props = [];
    this.coinsList = [];
    this.gems = [];
    this.powerups = [];
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.slashes = [];
    this.particles = [];
    this.floats = [];
    this.ambient = [];
    this.stars = Array.from({ length: 42 }, () => ({
      x: Math.random() * VIEW_W,
      y: Math.random() * 125,
      s: Math.random() > 0.72 ? 2 : 1,
      p: Math.random() * Math.PI * 2,
    }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      x: i * 85 + Math.random() * 35,
      y: 22 + Math.random() * 55,
      w: 28 + Math.random() * 26,
      spd: 4 + Math.random() * 6,
    }));
    for (let i = 0; i < 24; i++) {
      this.ambient.push({
        x: Math.random() * VIEW_W,
        y: Math.random() * (GROUND_Y - 12),
        vx: rand(-14, -4),
        vy: rand(-8, 8),
        p: Math.random() * 6.28,
        size: Math.random() > 0.6 ? 2 : 1,
      });
    }

    this.boss = null;
    this.arenaLockX = null;
    this.generatedUntil = 380;

    // Seed initial welcoming coins & torch props
    for (let i = 0; i < 6; i++) {
      this.coinsList.push({ x: 140 + i * 18, y: GROUND_Y - 18 - Math.sin(i * 0.6) * 14, vx: 0, vy: 0, free: false });
    }
    this.props.push({ type: 'torch', x: 110, y: GROUND_Y });
    this.props.push({ type: 'sign', x: 195, y: GROUND_Y, label: '0m' });
    this._generateWorldAhead();
    this._emitHud();
  }

  start() {
    this._resetState();
    this.running = true;
    this.paused = false;
    this.lastFrameTs = performance.now();
    pixelAudio.unlock();
    pixelAudio.startMusic(false);
    this._loop(this.lastFrameTs);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    pixelAudio.stopMusic();
  }

  togglePause() {
    if (!this.running || this.gameOver) return this.paused;
    this.paused = !this.paused;
    if (this.paused) {
      pixelAudio.stopMusic();
    } else {
      this.lastFrameTs = performance.now();
      pixelAudio.startMusic(Boolean(this.boss));
    }
    this._emitHud();
    return this.paused;
  }

  setMove(dir, pressed) {
    if (dir === 'left') this.input.left = pressed;
    if (dir === 'right') this.input.right = pressed;
  }

  setAutoRun(enabled) {
    this.autoRun = Boolean(enabled);
    this._emitHud();
  }

  triggerJump() {
    if (!this.running || this.paused || this.gameOver) return;
    pixelAudio.unlock();
    this.player.jumpBuf = 0.13;
  }

  triggerAttack() {
    if (!this.running || this.paused || this.gameOver) return;
    pixelAudio.unlock();
    const p = this.player;
    if (p.attackCd > 0) return;

    const skin = SKIN_PALETTES[this.skinId] || SKIN_PALETTES.royal_knight;
    const wCfg = WEAPON_CONFIGS[this.weaponId] || WEAPON_CONFIGS.iron_blade;
    const atkSpd = skin.stats.atkSpeed || 1.0;

    p.attackCd = wCfg.cooldown / atkSpd;
    p.attackAnim = 0.18;

    const critChance = (skin.stats.crit || 0.08) + (this.upgrades.crit_mastery || 0) * 0.06;
    const critMult = 1.75 + (this.upgrades.crit_mastery || 0) * 0.12;
    const isCrit = Math.random() < critChance;
    const baseDmg = wCfg.damage * (skin.stats.damage || 1.0) * (1 + (this.stage - 1) * 0.06);
    const dmg = Math.round(baseDmg * (isCrit ? critMult : 1));

    const sx = p.x + p.facing * 12;
    const sy = p.y - 11;

    if (wCfg.type === 'melee') {
      pixelAudio.play('sword');
      this.slashes.push({
        x: p.x + p.facing * 24,
        y: p.y - 11,
        r: 26,
        facing: p.facing,
        life: 0.15,
        maxLife: 0.15,
        color: wCfg.color,
        dmg,
        isCrit,
        hitIds: new Set(),
      });
    } else if (wCfg.type === 'ranged') {
      pixelAudio.play('bow');
      this.projectiles.push({
        kind: 'arrow', x: sx, y: sy, vx: p.facing * wCfg.speed, vy: 0,
        dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 0.9, pierce: 0, r: 5,
      });
    } else if (wCfg.type === 'spread') {
      pixelAudio.play('frost');
      [-34, 34].forEach((vy) => {
        this.projectiles.push({
          kind: 'shuriken', x: sx, y: sy, vx: p.facing * wCfg.speed, vy,
          dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 0.85, pierce: 0, slow: 2.2, r: 5, spin: 0,
        });
      });
    } else if (wCfg.type === 'explosive') {
      pixelAudio.play('fire');
      this.projectiles.push({
        kind: 'fireball', x: sx, y: sy, vx: p.facing * wCfg.speed, vy: -14,
        dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 1.0, explosive: true, r: 7,
      });
    } else if (wCfg.type === 'wave' || wCfg.type === 'lifesteal_wave') {
      pixelAudio.play('thunder');
      this.projectiles.push({
        kind: wCfg.type === 'lifesteal_wave' ? 'scythe_wave' : 'thunder_wave',
        x: sx, y: sy, vx: p.facing * wCfg.speed, vy: 0,
        dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 0.72, pierce: 4,
        lifesteal: wCfg.type === 'lifesteal_wave', r: 10, hitIds: new Set(),
      });
    } else if (wCfg.type === 'boomerang') {
      pixelAudio.play('frost');
      this.projectiles.push({
        kind: 'boomerang', x: sx, y: sy, vx: p.facing * wCfg.speed, vy: -10,
        dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 1.25, maxLife: 1.25,
        pierce: 99, returning: false, originFacing: p.facing, r: 7, spin: 0, hitIds: new Set(),
      });
    } else if (wCfg.type === 'triple_plasma') {
      pixelAudio.play('cannon');
      [-48, 0, 48].forEach((vy) => {
        this.projectiles.push({
          kind: 'plasma', x: sx, y: sy, vx: p.facing * wCfg.speed, vy,
          dmg, isCrit, color: wCfg.color, glow: wCfg.glow, life: 0.9, explosive: true, r: 6,
        });
      });
      this._shake(0.08, 2.5);
    }

    this.onHaptic('light');
  }

  triggerDash() {
    if (!this.running || this.paused || this.gameOver) return;
    pixelAudio.unlock();
    const p = this.player;
    if (p.dashCd > 0) return;

    const dashLvl = this.upgrades.dash || 0;
    p.dashTimer = 0.16;
    p.dashCd = Math.max(0.55, 1.35 - dashLvl * 0.14);
    p.vx = p.facing * (310 + dashLvl * 20);
    p.vy = 0;
    pixelAudio.play('dash');
    this._spawnParticles(p.x, p.y - 10, 10, (SKIN_PALETTES[this.skinId] || SKIN_PALETTES.royal_knight).trail);
    this.onHaptic('medium');
  }

  triggerUltimate() {
    if (!this.running || this.paused || this.gameOver) return;
    const p = this.player;
    if (p.rage < 100) return;
    p.rage = 0;
    this.ultFlash = 0.45;
    p.starTimer = Math.max(p.starTimer, 2.4);
    this._shake(0.35, 6);
    pixelAudio.play('ultimate');
    this.onHaptic('heavy');

    const ultDmg = 135 + (this.upgrades.ultimate || 0) * 42 + this.stage * 20;
    // Clear enemy projectiles
    this.enemyProjectiles.forEach((ep) => this._spawnParticles(ep.x, ep.y, 6, '#FEF08A'));
    this.enemyProjectiles = [];

    // Strike every visible enemy with golden lightning bolts
    this.enemies.forEach((e) => {
      if (e.x >= this.cameraX - 20 && e.x <= this.cameraX + VIEW_W + 30) {
        this._damageEnemy(e, ultDmg, true);
        this._spawnParticles(e.x, e.y - 12, 16, '#FEF08A');
      }
    });
    if (this.boss && !this.boss.dead) {
      this._damageBoss(Math.round(ultDmg * 1.15), true);
      this._spawnParticles(this.boss.x, this.boss.y - 25, 24, '#FDE047');
    }
    this._addFloat(p.x, p.y - 36, '⚡ طوفان رویال!', '#FEF08A');
    this._emitHud();
  }

  _shake(dur, mag) {
    this.shakeTimer = Math.max(this.shakeTimer, dur);
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  _spawnParticles(x, y, count, color, speed = 95) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(20, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25,
        life: rand(0.22, 0.58), maxLife: 0.58, color, size: Math.random() > 0.55 ? 2 : 1,
      });
    }
    if (this.particles.length > 260) {
      this.particles.splice(0, this.particles.length - 260);
    }
  }

  _addFloat(x, y, text, color = '#FEF08A') {
    this.floats.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
  }

  _gainRage(amount) {
    const mult = 1 + (this.upgrades.ultimate || 0) * 0.16;
    this.player.rage = Math.min(100, this.player.rage + amount * mult);
  }

  _addCoins(baseCount) {
    const skin = SKIN_PALETTES[this.skinId] || SKIN_PALETTES.royal_knight;
    const greedMult = 1 + (this.upgrades.greed || 0) * 0.15;
    const feverMult = this.player.feverTimer > 0 ? 2 : 1;
    const gained = Math.max(1, Math.round(baseCount * (skin.stats.coinBonus || 1) * greedMult * feverMult));
    this.coins += gained;
    return gained;
  }

  _addScore(pts) {
    const pet = PET_CONFIGS[this.petId] || PET_CONFIGS.none;
    const bonus = pet.scoreBonus || 1;
    const comboMult = 1 + Math.min(15, this.combo) * 0.08;
    this.score += Math.round(pts * bonus * comboMult);
  }

  // ── Procedural World Generation ────────────────────────────────────────
  _generateWorldAhead() {
    while (this.generatedUntil < this.cameraX + VIEW_W + 420) {
      const gx = this.generatedUntil;
      const distMeters = Math.floor(gx / 10);

      // Boss arena flat ground if approaching boss milestone
      if (!this.boss && distMeters >= this.nextBossAt - 18 && distMeters <= this.nextBossAt + 28) {
        const segW = 460;
        this.grounds.push({ x: gx, y: GROUND_Y, w: segW, h: 60 });
        this.props.push({ type: 'torch', x: gx + 40, y: GROUND_Y });
        this.props.push({ type: 'torch', x: gx + segW - 40, y: GROUND_Y });
        this.generatedUntil += segW;
        continue;
      }

      // Occasional jumpable pit after 80m
      const makeGap = distMeters > 60 && Math.random() < Math.min(0.32, 0.15 + this.stage * 0.03);
      let startX = gx;
      if (makeGap) {
        const gapW = Math.round(rand(44, Math.min(78, 56 + this.stage * 4)));
        // Arc of coins guiding jump over gap
        for (let i = 0; i < 4; i++) {
          this.coinsList.push({
            x: startX + 8 + i * ((gapW - 16) / 3),
            y: GROUND_Y - 34 - Math.sin((i / 3) * Math.PI) * 20,
            vx: 0, vy: 0, free: false,
          });
        }
        startX += gapW;
      }

      const segW = Math.round(rand(155, 275));
      this.grounds.push({ x: startX, y: GROUND_Y, w: segW, h: 60 });

      // Decorative props + distance milestone signs
      if (Math.random() < 0.72) {
        this.props.push({ type: 'torch', x: startX + rand(20, segW - 20), y: GROUND_Y });
      }
      if (Math.random() < 0.45) {
        this.props.push({ type: 'sign', x: startX + 24, y: GROUND_Y, label: `${distMeters}m` });
      }

      // Elevated platforms (static or moving) + mystery blocks + chests
      if (Math.random() < 0.75) {
        const pw = Math.round(rand(52, 96));
        const pxPos = startX + rand(18, Math.max(24, segW - pw - 18));
        const pyPos = GROUND_Y - Math.round(rand(46, 78));
        const moving = distMeters > 90 && Math.random() < 0.28;
        this.platforms.push({
          x: pxPos, y: pyPos, baseX: pxPos, w: pw, h: 12,
          moving, amp: moving ? rand(18, 34) : 0, spd: rand(1.4, 2.4), phase: Math.random() * 6.28,
        });
        // Coins on platform
        const cCount = Math.floor(pw / 18);
        for (let i = 0; i < cCount; i++) {
          this.coinsList.push({ x: pxPos + 10 + i * 16, y: pyPos - 11, vx: 0, vy: 0, free: false });
        }
        // Treasure chest or mystery block
        if (Math.random() < 0.36) {
          this.chests.push({ x: pxPos + pw / 2 - 9, y: pyPos - 13, opened: false });
        } else if (Math.random() < 0.48) {
          this.blocks.push({ x: pxPos + pw / 2 - 8, y: pyPos - 44, used: false, bump: 0 });
        }
      }

      // Ground mystery block row
      if (Math.random() < 0.42 && segW > 170) {
        this.blocks.push({ x: startX + segW * 0.45, y: GROUND_Y - 54, used: false, bump: 0 });
      }

      // Bounce spring leading to high bonus gem/coins
      if (Math.random() < 0.28) {
        const spX = startX + rand(28, segW - 44);
        this.springs.push({ x: spX, y: GROUND_Y - 9, bounceTimer: 0 });
        for (let i = 0; i < 4; i++) {
          this.coinsList.push({ x: spX + 18 + i * 16, y: GROUND_Y - 95 - Math.sin(i * 0.8) * 14, vx: 0, vy: 0, free: false });
        }
        this.gems.push({ x: spX + 46, y: GROUND_Y - 118, vx: 0, vy: 0, free: false });
      }

      // Healing Shrine occasionally
      if (distMeters > 100 && Math.random() < 0.14) {
        this.shrines.push({ x: startX + segW * 0.5, y: GROUND_Y, used: false });
      }

      // Spike trap
      if (distMeters > 45 && segW > 180 && Math.random() < 0.32) {
        this.spikes.push({ x: startX + rand(48, segW - 60), y: GROUND_Y - 8, w: 22, h: 8 });
      }

      // Spawn enemies scaled to stage
      const enemyCount = Math.random() < 0.55 ? 2 : 1;
      for (let i = 0; i < enemyCount; i++) {
        const ex = startX + rand(40, Math.max(46, segW - 30));
        this._spawnEnemy(ex, startX + 8, startX + segW - 8);
      }

      this.generatedUntil = startX + segW;
    }
  }

  _spawnEnemy(x, minX, maxX) {
    const pool = ['slime', 'goblin'];
    if (this.stage >= 1) pool.push('bat', 'skeleton');
    if (this.stage >= 2) pool.push('golem', 'imp');
    if (this.stage >= 3) pool.push('turret');
    const type = pool[Math.floor(Math.random() * pool.length)];
    const mult = 1 + (this.stage - 1) * 0.28;

    const defs = {
      slime: { w: 16, h: 13, hp: 34, spd: 32, score: 60, coins: 4, flying: false, ranged: false },
      goblin: { w: 14, h: 19, hp: 46, spd: 58, score: 85, coins: 6, flying: false, ranged: false },
      skeleton: { w: 14, h: 21, hp: 52, spd: 26, score: 105, coins: 8, flying: false, ranged: true, shootCd: 2.1 },
      bat: { w: 18, h: 12, hp: 36, spd: 52, score: 95, coins: 7, flying: true, ranged: false },
      golem: { w: 22, h: 26, hp: 115, spd: 22, score: 170, coins: 14, flying: false, ranged: false },
      imp: { w: 16, h: 18, hp: 62, spd: 42, score: 130, coins: 10, flying: true, ranged: true, shootCd: 2.3 },
      turret: { w: 16, h: 21, hp: 80, spd: 0, score: 145, coins: 12, flying: false, ranged: true, shootCd: 1.85 },
    };
    const d = defs[type];
    const y = d.flying ? GROUND_Y - rand(46, 92) : GROUND_Y;
    this.enemies.push({
      id: Math.random().toString(36).slice(2),
      type,
      x,
      y,
      baseY: y,
      vx: d.spd === 0 ? 0 : (Math.random() > 0.5 ? -d.spd : d.spd),
      vy: 0,
      w: d.w,
      h: d.h,
      hp: Math.round(d.hp * mult),
      maxHp: Math.round(d.hp * mult),
      score: d.score,
      coins: d.coins,
      flying: d.flying,
      ranged: d.ranged,
      shootTimer: rand(0.9, d.shootCd || 2.2),
      shootCd: d.shootCd || 2.2,
      minX,
      maxX,
      hurtTimer: 0,
      slowTimer: 0,
      seed: Math.random() * 10,
    });
  }

  _spawnBoss() {
    const bx = this.player.x + 210;
    this.arenaLockX = Math.max(0, this.player.x - 50);
    // Ensure solid floor under entire boss arena
    this.grounds.push({ x: this.arenaLockX - 20, y: GROUND_Y, w: VIEW_W + 120, h: 60 });
    const maxHp = Math.round(360 * (1 + (this.stage - 1) * 0.52));
    this.boss = {
      bossType: this.biome.bossType,
      name: this.biome.bossName,
      x: bx,
      y: GROUND_Y,
      vx: -48,
      vy: 0,
      w: 38,
      h: 48,
      hp: maxHp,
      maxHp,
      actionTimer: 1.6,
      hurtTimer: 0,
      dead: false,
    };
    this.bannerText = `⚠️ باس‌فایت: ${this.biome.bossName}`;
    this.bannerTimer = 2.8;
    pixelAudio.play('bossWarn');
    pixelAudio.setBossMode(true);
    this._shake(0.35, 4);
    this.onHaptic('heavy');
    this._emitHud();
  }

  // ── Main Loop ──────────────────────────────────────────────────────────
  _loop(ts) {
    if (!this.running) return;
    const rawDt = (ts - this.lastFrameTs) / 1000;
    this.lastFrameTs = ts;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    if (!this.paused && !this.gameOver) {
      if (this.hitStop > 0) {
        this.hitStop -= dt;
      } else {
        this._update(dt);
      }
    }
    this._render();

    this.hudTick += dt;
    if (this.hudTick >= 0.08) {
      this.hudTick = 0;
      this._emitHud();
    }

    this.rafId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.time += dt;
    const p = this.player;
    const skin = SKIN_PALETTES[this.skinId] || SKIN_PALETTES.royal_knight;
    const pet = PET_CONFIGS[this.petId] || PET_CONFIGS.none;

    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.ultFlash > 0) this.ultFlash -= dt;
    if (p.hurtTimer > 0) p.hurtTimer -= dt;
    if (p.attackCd > 0) p.attackCd -= dt;
    if (p.attackAnim > 0) p.attackAnim -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.starTimer > 0) p.starTimer -= dt;
    if (p.magnetTimer > 0) p.magnetTimer -= dt;
    if (p.feverTimer > 0) p.feverTimer -= dt;
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Update moving platforms
    for (const pl of this.platforms) {
      if (pl.moving) {
        const prev = pl.x;
        pl.x = pl.baseX + Math.sin(this.time * pl.spd + pl.phase) * pl.amp;
        pl.dx = pl.x - prev;
      } else {
        pl.dx = 0;
      }
    }

    // Horizontal player movement
    const baseSpeed = 136 * (skin.stats.speed || 1.0) * (p.starTimer > 0 ? 1.18 : 1.0);
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.afterimages.push({ x: p.x, y: p.y, facing: p.facing, life: 0.16 });
    } else {
      let moveDir = 0;
      if (this.input.left) moveDir -= 1;
      if (this.input.right) moveDir += 1;
      if (moveDir === 0 && this.autoRun && !this.boss) {
        moveDir = 1;
      }
      if (moveDir !== 0) {
        p.vx = moveDir * baseSpeed;
        p.facing = moveDir;
      } else {
        p.vx *= Math.pow(0.001, dt);
        if (Math.abs(p.vx) < 4) p.vx = 0;
      }
    }

    // Coyote time & buffered jump / double jump
    if (p.onGround) {
      p.coyote = 0.10;
      p.jumpsLeft = 2;
    } else if (p.coyote > 0) {
      p.coyote -= dt;
    }

    if (p.jumpBuf > 0) {
      if (p.coyote > 0) {
        p.vy = -282;
        p.onGround = false;
        p.coyote = 0;
        p.jumpsLeft = 1;
        p.jumpBuf = 0;
        pixelAudio.play('jump');
        this._spawnParticles(p.x, p.y, 6, this.biome.tileTopLight, 55);
      } else if (p.jumpsLeft > 0) {
        p.vy = -255;
        p.jumpsLeft -= 1;
        p.jumpBuf = 0;
        pixelAudio.play('doubleJump');
        this._spawnParticles(p.x, p.y, 8, skin.trail, 70);
      }
    }

    // Apply gravity & integrate
    const prevY = p.y;
    if (p.dashTimer <= 0) p.vy = Math.min(460, p.vy + GRAVITY * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Clamp to camera / arena boundaries
    const minLeft = this.arenaLockX !== null ? this.arenaLockX + 12 : Math.max(12, this.cameraX - 8);
    if (p.x < minLeft) p.x = minLeft;
    if (this.arenaLockX !== null && p.x > this.arenaLockX + VIEW_W - 14) {
      p.x = this.arenaLockX + VIEW_W - 14;
    }

    // Ground & platform collisions
    p.onGround = false;
    for (const g of this.grounds) {
      if (p.x + 6 > g.x && p.x - 6 < g.x + g.w) {
        if (prevY <= g.y + 4 && p.y >= g.y && p.vy >= 0) {
          p.y = g.y;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }
    for (const pl of this.platforms) {
      if (p.x + 6 > pl.x && p.x - 6 < pl.x + pl.w) {
        if (prevY <= pl.y + 5 && p.y >= pl.y && p.vy >= 0) {
          p.y = pl.y;
          p.vy = 0;
          p.onGround = true;
          p.x += pl.dx || 0;
        }
      }
    }

    // Mystery blocks (hit from below OR stand on top)
    for (const b of this.blocks) {
      if (b.bump > 0) b.bump = Math.max(0, b.bump - dt * 28);
      if (p.x + 7 > b.x && p.x - 7 < b.x + 16) {
        // Stand on top
        if (prevY <= b.y + 4 && p.y >= b.y && p.vy >= 0) {
          p.y = b.y;
          p.vy = 0;
          p.onGround = true;
        }
        // Head-bonk from below
        if (!b.used && p.vy < 0 && prevY - p.h >= b.y + 12 && p.y - p.h <= b.y + 16) {
          b.used = true;
          b.bump = 5;
          p.vy = 40;
          this._openMysteryBlock(b);
        }
      }
    }

    // Pit fall recovery (lose 1 HP and bounce back up instead of unfair instant death unless 0 HP)
    if (p.y > VIEW_H + 34) {
      this._damagePlayer(1);
      if (!this.gameOver) {
        p.y = GROUND_Y - 50;
        p.vy = -180;
        p.x += 26;
      }
    }

    // Springs
    for (const sp of this.springs) {
      if (sp.bounceTimer > 0) sp.bounceTimer -= dt;
      if (Math.abs(p.x - (sp.x + 7)) < 13 && Math.abs(p.y - (sp.y + 6)) < 12 && p.vy >= -20) {
        p.vy = -395;
        p.onGround = false;
        p.jumpsLeft = 1;
        sp.bounceTimer = 0.25;
        pixelAudio.play('spring');
        this._spawnParticles(sp.x + 7, sp.y, 10, '#FCA5A5', 90);
        this.onHaptic('medium');
      }
    }

    // Chests
    for (const ch of this.chests) {
      if (!ch.opened && Math.abs(p.x - (ch.x + 9)) < 17 && Math.abs(p.y - (ch.y + 13)) < 18) {
        ch.opened = true;
        pixelAudio.play('chest');
        this.onHaptic('medium');
        const cGain = this._addCoins(12 + this.stage * 3);
        this._addScore(180);
        this._gainRage(14);
        this._addFloat(ch.x + 9, ch.y - 6, `+${cGain} 🪙`, '#FEF08A');
        for (let i = 0; i < 6; i++) {
          this.coinsList.push({ x: ch.x + 9, y: ch.y, vx: rand(-65, 65), vy: rand(-160, -90), free: true });
        }
        this._spawnParticles(ch.x + 9, ch.y + 4, 16, '#FACC15');
      }
    }

    // Healing Shrines
    for (const sh of this.shrines) {
      if (!sh.used && Math.abs(p.x - sh.x) < 16 && Math.abs(p.y - sh.y) < 22) {
        sh.used = true;
        p.hp = Math.min(p.maxHp, p.hp + 1);
        this._gainRage(20);
        pixelAudio.play('powerup');
        this._addFloat(sh.x, sh.y - 30, '+۱ ❤️ شفا!', '#4ADE80');
        this._spawnParticles(sh.x, sh.y - 16, 16, '#34D399');
      }
    }

    // Spikes
    for (const sk of this.spikes) {
      if (p.x + 5 > sk.x + 2 && p.x - 5 < sk.x + sk.w - 2 && p.y > sk.y + 1 && p.y - p.h < sk.y + sk.h) {
        this._damagePlayer(1);
      }
    }

    // Track distance & spawn boss
    if (p.x > this.furthestX) {
      const dx = p.x - this.furthestX;
      this.furthestX = p.x;
      this.distance = Math.floor((this.furthestX - 60) / 10);
      this.score += Math.round(dx * 0.25);
    }

    if (!this.boss && this.distance >= this.nextBossAt) {
      this._spawnBoss();
    }

    // Camera follow
    const targetCam = this.arenaLockX !== null ? this.arenaLockX : Math.max(0, p.x - VIEW_W * 0.30);
    this.cameraX += (targetCam - this.cameraX) * Math.min(1, dt * 8);

    // Update Pet Companion
    this._updatePet(dt, pet);

    // Update Collectibles (Coins, Gems, Powerups)
    this._updateCollectibles(dt, skin, pet);

    // Update Slashes & Projectiles
    this._updateCombat(dt);

    // Update Enemies & Boss
    this._updateEnemies(dt);
    if (this.boss) this._updateBoss(dt);

    // Update Afterimages, Particles, Floats, Ambient
    p.afterimages = p.afterimages.filter((a) => { a.life -= dt; return a.life > 0; });
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 210 * dt;
      pt.life -= dt;
      return pt.life > 0;
    });
    this.floats = this.floats.filter((fl) => {
      fl.y -= 24 * dt;
      fl.life -= dt;
      return fl.life > 0;
    });
    for (const a of this.ambient) {
      a.x += a.vx * dt;
      a.y += (a.vy + Math.sin(this.time * 3 + a.p) * 8) * dt;
      if (a.x < -6) a.x = VIEW_W + 4;
      if (a.y < 6) a.y = GROUND_Y - 12;
      if (a.y > GROUND_Y - 6) a.y = 10;
    }
    for (const c of this.clouds) {
      c.x -= c.spd * dt;
      if (c.x + c.w < -10) c.x = VIEW_W + 20;
    }

    // Generate ahead & prune behind
    this._generateWorldAhead();
    this._pruneBehind();
  }

  _openMysteryBlock(b) {
    pixelAudio.play('powerup');
    const roll = Math.random();
    if (roll < 0.42) {
      const c = this._addCoins(8 + this.stage * 2);
      this._addFloat(b.x + 8, b.y - 6, `+${c} 🪙`, '#FACC15');
      this._spawnParticles(b.x + 8, b.y, 10, '#FACC15');
    } else if (roll < 0.60) {
      this.powerups.push({ x: b.x + 8, y: b.y - 10, kind: 'heart' });
    } else if (roll < 0.74) {
      this.powerups.push({ x: b.x + 8, y: b.y - 10, kind: 'shield' });
    } else if (roll < 0.85) {
      this.powerups.push({ x: b.x + 8, y: b.y - 10, kind: 'magnet' });
    } else if (roll < 0.93) {
      this.powerups.push({ x: b.x + 8, y: b.y - 10, kind: 'fever' });
    } else {
      this.powerups.push({ x: b.x + 8, y: b.y - 10, kind: 'star' });
    }
  }

  _updatePet(dt, pet) {
    if (!this.petId || this.petId === 'none') return;
    const p = this.player;
    const tx = p.x - p.facing * 22;
    const ty = p.y - 26;
    this.petState.x += (tx - this.petState.x) * Math.min(1, dt * 6);
    this.petState.y += (ty - this.petState.y) * Math.min(1, dt * 6);

    if (pet.fireInterval) {
      this.petState.fireCd -= dt;
      if (this.petState.fireCd <= 0) {
        // Find nearest enemy or boss in range
        let target = null;
        let bestDist = 230;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - this.petState.x, (e.y - e.h / 2) - this.petState.y);
          if (d < bestDist) { bestDist = d; target = { x: e.x, y: e.y - e.h / 2 }; }
        }
        if (this.boss && !this.boss.dead) {
          const d = Math.hypot(this.boss.x - this.petState.x, (this.boss.y - 24) - this.petState.y);
          if (d < 260) target = { x: this.boss.x, y: this.boss.y - 24 };
        }
        if (target) {
          this.petState.fireCd = pet.fireInterval;
          const ang = Math.atan2(target.y - this.petState.y, target.x - this.petState.x);
          const spd = 260;
          this.projectiles.push({
            kind: this.petId === 'royal_dragon' ? 'plasma' : 'fireball',
            x: this.petState.x,
            y: this.petState.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            dmg: Math.round((pet.damage || 22) * (1 + (this.stage - 1) * 0.12)),
            isCrit: false,
            color: pet.color,
            glow: pet.color,
            life: 0.95,
            r: 5,
            explosive: this.petId === 'royal_dragon',
          });
        }
      }
    }
  }

  _updateCollectibles(dt, skin, pet) {
    const p = this.player;
    const baseMag = 34 + (this.upgrades.magnet || 0) * 18;
    const magR = baseMag * (skin.stats.magnet || 1) * (pet.magnetBoost || 1) * (p.magnetTimer > 0 ? 2.4 : 1);

    this.coinsList = this.coinsList.filter((c) => {
      if (c.free) {
        c.vy += GRAVITY * 0.65 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > GROUND_Y - 5) { c.y = GROUND_Y - 5; c.vy *= -0.35; c.vx *= 0.7; }
      }
      const dx = p.x - c.x;
      const dy = (p.y - 11) - c.y;
      const d = Math.hypot(dx, dy);
      if (d < magR && d > 1) {
        const pull = 220 * dt;
        c.x += (dx / d) * pull;
        c.y += (dy / d) * pull;
      }
      if (d < 15) {
        this._addCoins(1);
        this._addScore(15);
        this._gainRage(1.5);
        pixelAudio.play('coin');
        this._spawnParticles(c.x, c.y, 4, '#FEF08A', 50);
        return false;
      }
      return c.x > this.cameraX - 60;
    });

    this.gems = this.gems.filter((g) => {
      if (g.free) {
        g.vy += GRAVITY * 0.6 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y > GROUND_Y - 6) { g.y = GROUND_Y - 6; g.vy *= -0.3; g.vx *= 0.7; }
      }
      const dx = p.x - g.x;
      const dy = (p.y - 11) - g.y;
      const d = Math.hypot(dx, dy);
      if (d < magR * 1.15 && d > 1) {
        g.x += (dx / d) * 240 * dt;
        g.y += (dy / d) * 240 * dt;
      }
      if (d < 16) {
        const cGain = this._addCoins(6);
        this._addScore(95);
        this._gainRage(9);
        pixelAudio.play('gem');
        this._addFloat(g.x, g.y - 8, `+${cGain} 💎`, '#E879F9');
        this._spawnParticles(g.x, g.y, 10, '#E879F9', 80);
        return false;
      }
      return g.x > this.cameraX - 60;
    });

    this.powerups = this.powerups.filter((pw) => {
      const d = Math.hypot(p.x - pw.x, (p.y - 11) - pw.y);
      if (d < 18) {
        pixelAudio.play('powerup');
        this.onHaptic('medium');
        if (pw.kind === 'heart') {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          this._addFloat(pw.x, pw.y - 8, '+۱ ❤️', '#F87171');
        } else if (pw.kind === 'shield') {
          p.shield = true;
          this._addFloat(pw.x, pw.y - 8, '🛡️ سپر فعال!', '#38BDF8');
        } else if (pw.kind === 'magnet') {
          p.magnetTimer = 9.0;
          this._addFloat(pw.x, pw.y - 8, '🧲 آهنربا!', '#60A5FA');
        } else if (pw.kind === 'star') {
          p.starTimer = 7.0;
          this._addFloat(pw.x, pw.y - 8, '⭐ شکست‌ناپذیر!', '#FEF08A');
        } else if (pw.kind === 'fever') {
          p.feverTimer = 10.0;
          this._addFloat(pw.x, pw.y - 8, '🪙 سکه ۲ برابر!', '#F59E0B');
        }
        this._spawnParticles(pw.x, pw.y, 12, '#FEF08A');
        return false;
      }
      return pw.x > this.cameraX - 60;
    });
  }

  _updateCombat(dt) {
    const p = this.player;
    // Melee slashes (can deflect enemy projectiles!)
    this.slashes = this.slashes.filter((s) => {
      s.life -= dt;
      s.x = p.x + s.facing * 24;
      s.y = p.y - 11;
      // Deflect enemy projectiles
      this.enemyProjectiles = this.enemyProjectiles.filter((ep) => {
        if (Math.hypot(ep.x - s.x, ep.y - s.y) < s.r + 6) {
          this._spawnParticles(ep.x, ep.y, 6, '#FEF08A');
          this._addFloat(ep.x, ep.y - 8, 'دفع!', '#FEF08A');
          return false;
        }
        return true;
      });
      for (const e of this.enemies) {
        if (!s.hitIds.has(e.id) && Math.hypot(e.x - s.x, (e.y - e.h / 2) - s.y) < s.r + e.w * 0.5) {
          s.hitIds.add(e.id);
          this._damageEnemy(e, s.dmg, s.isCrit);
        }
      }
      if (this.boss && !this.boss.dead && !s.hitIds.has('boss')) {
        if (Math.hypot(this.boss.x - s.x, (this.boss.y - 24) - s.y) < s.r + 22) {
          s.hitIds.add('boss');
          this._damageBoss(s.dmg, s.isCrit);
        }
      }
      return s.life > 0;
    });

    // Player projectiles
    this.projectiles = this.projectiles.filter((pr) => {
      pr.life -= dt;
      if (pr.spin !== undefined) pr.spin += dt * 18;
      if (pr.kind === 'boomerang') {
        if (!pr.returning && pr.life < pr.maxLife * 0.55) {
          pr.returning = true;
          pr.hitIds.clear();
        }
        if (pr.returning) {
          const ang = Math.atan2((p.y - 11) - pr.y, p.x - pr.x);
          pr.vx = Math.cos(ang) * 290;
          pr.vy = Math.sin(ang) * 290;
          if (Math.hypot(p.x - pr.x, (p.y - 11) - pr.y) < 16) return false;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      let alive = pr.life > 0;
      for (const e of this.enemies) {
        if (pr.hitIds && pr.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - pr.x, (e.y - e.h / 2) - pr.y) < pr.r + e.w * 0.55) {
          if (pr.hitIds) pr.hitIds.add(e.id);
          this._damageEnemy(e, pr.dmg, pr.isCrit, pr.slow || 0, pr.lifesteal);
          if (pr.explosive) this._explode(pr.x, pr.y, Math.round(pr.dmg * 0.65), pr.color);
          if (pr.pierce > 0) {
            pr.pierce -= 1;
          } else {
            alive = false;
            break;
          }
        }
      }
      if (alive && this.boss && !this.boss.dead) {
        if (!(pr.hitIds && pr.hitIds.has('boss')) && Math.hypot(this.boss.x - pr.x, (this.boss.y - 24) - pr.y) < pr.r + 24) {
          if (pr.hitIds) pr.hitIds.add('boss');
          this._damageBoss(pr.dmg, pr.isCrit);
          if (pr.explosive) this._explode(pr.x, pr.y, Math.round(pr.dmg * 0.45), pr.color);
          if (pr.pierce > 0) pr.pierce -= 1;
          else alive = false;
        }
      }
      return alive;
    });

    // Enemy projectiles
    this.enemyProjectiles = this.enemyProjectiles.filter((ep) => {
      ep.life -= dt;
      ep.x += ep.vx * dt;
      ep.y += ep.vy * dt;
      if (Math.hypot(ep.x - p.x, ep.y - (p.y - 11)) < ep.r + 7) {
        this._damagePlayer(1);
        return false;
      }
      return ep.life > 0;
    });
  }

  _explode(x, y, dmg, color) {
    this._spawnParticles(x, y, 14, color, 110);
    this._shake(0.1, 2.5);
    for (const e of this.enemies) {
      if (Math.hypot(e.x - x, (e.y - e.h / 2) - y) < 38) {
        this._damageEnemy(e, dmg, false);
      }
    }
  }

  _damageEnemy(e, dmg, isCrit, slow = 0, lifesteal = false) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.hurtTimer = 0.14;
    if (slow > 0) e.slowTimer = Math.max(e.slowTimer, slow);
    this._addFloat(e.x, e.y - e.h - 4, isCrit ? `${dmg}!` : `${dmg}`, isCrit ? '#FDE047' : '#FFFFFF');
    this._spawnParticles(e.x, e.y - e.h / 2, isCrit ? 9 : 5, isCrit ? '#FDE047' : '#FCA5A5', 70);

    if (e.hp <= 0) {
      this.kills += 1;
      this.combo += 1;
      this.comboTimer = 3.2;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this._addScore(e.score);
      this._gainRage(9);
      pixelAudio.play('enemyDie');
      this._spawnParticles(e.x, e.y - e.h / 2, 14, this.biome.accent, 115);

      if (lifesteal) {
        this.lifestealCounter += 1;
        if (this.lifestealCounter >= 10) {
          this.lifestealCounter = 0;
          if (this.player.hp < this.player.maxHp) {
            this.player.hp += 1;
            this._addFloat(this.player.x, this.player.y - 28, '+۱ ❤️ خون‌آشام', '#FB7185');
          }
        }
      }

      // Drop coins / gem
      const coinDrops = Math.min(4, Math.max(1, Math.ceil(e.coins / 3)));
      for (let i = 0; i < coinDrops; i++) {
        this.coinsList.push({ x: e.x, y: e.y - 8, vx: rand(-55, 55), vy: rand(-130, -70), free: true });
      }
      if (Math.random() < 0.2) {
        this.gems.push({ x: e.x, y: e.y - 10, vx: rand(-35, 35), vy: -120, free: true });
      }
    } else {
      pixelAudio.play('hit');
    }
  }

  _damageBoss(dmg, isCrit) {
    const b = this.boss;
    if (!b || b.dead) return;
    b.hp -= dmg;
    b.hurtTimer = 0.14;
    this._addFloat(b.x + rand(-12, 12), b.y - b.h - 4, isCrit ? `${dmg}!` : `${dmg}`, isCrit ? '#FDE047' : '#FCA5A5');
    this._spawnParticles(b.x, b.y - 24, 8, '#FEF08A', 80);

    if (b.hp <= 0) {
      b.dead = true;
      this.bossesDefeated += 1;
      this.kills += 1;
      this.hitStop = 0.12;
      this._shake(0.45, 7);
      pixelAudio.play('bossDefeat');
      pixelAudio.setBossMode(false);
      this.onHaptic('heavy');

      const cGain = this._addCoins(45 + this.stage * 18);
      this._addScore(950 + this.stage * 280);
      this._addFloat(b.x, b.y - 40, `🏆 باس شکست خورد! +${cGain} 🪙`, '#FEF08A');
      this._spawnParticles(b.x, b.y - 24, 42, '#FACC15', 165);
      for (let i = 0; i < 10; i++) {
        this.coinsList.push({ x: b.x, y: b.y - 20, vx: rand(-110, 110), vy: rand(-200, -100), free: true });
      }
      for (let i = 0; i < 3; i++) {
        this.gems.push({ x: b.x, y: b.y - 24, vx: rand(-80, 80), vy: rand(-180, -110), free: true });
      }
      this.powerups.push({ x: b.x, y: GROUND_Y - 12, kind: 'heart' });

      // Advance stage & biome!
      this.stage += 1;
      this.biome = getBiomeForStage(this.stage);
      this.nextBossAt = this.distance + BOSS_INTERVAL_METERS;
      this.boss = null;
      this.arenaLockX = null;
      if ((PET_CONFIGS[this.petId] || {}).stageShield) {
        this.player.shield = true;
      }
      this.bannerText = `✨ مرحله ${this.stage} — ${this.biome.name}`;
      this.bannerTimer = 3.0;
      this._emitHud();
    } else {
      pixelAudio.play('hit');
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) return false;
      if (e.hurtTimer > 0) e.hurtTimer -= dt;
      if (e.slowTimer > 0) e.slowTimer -= dt;

      const slowFactor = e.slowTimer > 0 ? 0.45 : 1.0;
      if (e.flying) {
        e.x += e.vx * slowFactor * dt;
        e.y = e.baseY + Math.sin(this.time * 4 + e.seed) * 14;
        if (e.x < e.minX) e.vx = Math.abs(e.vx);
        if (e.x > e.maxX) e.vx = -Math.abs(e.vx);
      } else {
        e.x += e.vx * slowFactor * dt;
        if (e.x < e.minX) e.vx = Math.abs(e.vx);
        if (e.x > e.maxX) e.vx = -Math.abs(e.vx);
      }

      // Ranged enemies shoot when visible
      if (e.ranged && Math.abs(e.x - p.x) < 220) {
        e.shootTimer -= dt * slowFactor;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootCd;
          const ang = Math.atan2((p.y - 11) - (e.y - e.h * 0.6), p.x - e.x);
          const spd = e.type === 'turret' ? 165 : 135;
          this.enemyProjectiles.push({
            x: e.x, y: e.y - e.h * 0.6, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            r: 4, color: e.type === 'imp' ? '#FB923C' : e.type === 'turret' ? '#E879F9' : '#E5E7EB', life: 2.2,
          });
        }
      }

      // Player collision: Dash strike, Star ram, Mario stomp, or Player hurt
      if (Math.abs(p.x - e.x) < (p.w + e.w) * 0.48 && p.y > e.y - e.h && p.y - p.h < e.y) {
        if (p.starTimer > 0) {
          this._damageEnemy(e, 999, true);
        } else if (p.dashTimer > 0) {
          const dashDmg = 28 + (this.upgrades.dash || 0) * 16;
          this._damageEnemy(e, dashDmg, false);
        } else if (p.vy > 35 && p.y - p.vy * dt <= e.y - e.h + 10) {
          // Mario-style head stomp!
          p.vy = -245;
          p.jumpsLeft = 1;
          pixelAudio.play('stomp');
          this._damageEnemy(e, 45 + this.stage * 10, true);
        } else {
          this._damagePlayer(1);
        }
      }

      return e.hp > 0 && e.x > this.cameraX - 140;
    });
  }

  _updateBoss(dt) {
    const b = this.boss;
    const p = this.player;
    if (!b || b.dead) return;
    if (b.hurtTimer > 0) b.hurtTimer -= dt;

    const enraged = b.hp < b.maxHp * 0.5;
    b.actionTimer -= dt * (enraged ? 1.35 : 1.0);

    // Movement & arena bounds
    b.vy += GRAVITY * 0.7 * dt;
    b.x += b.vx * (enraged ? 1.25 : 1.0) * dt;
    b.y += b.vy * dt;
    if (b.y >= GROUND_Y) {
      b.y = GROUND_Y;
      b.vy = 0;
    }

    const leftBound = (this.arenaLockX || 0) + 45;
    const rightBound = (this.arenaLockX || 0) + VIEW_W - 35;
    if (b.x < leftBound) b.vx = Math.abs(b.vx);
    if (b.x > rightBound) b.vx = -Math.abs(b.vx);

    if (b.actionTimer <= 0) {
      b.actionTimer = enraged ? 1.35 : 1.85;
      const move = Math.random();
      if (move < 0.45) {
        // Leap toward player
        b.vy = -260;
        b.vx = (p.x < b.x ? -1 : 1) * (enraged ? 105 : 75);
      } else {
        // Fan of projectiles
        const count = enraged ? 5 : 3;
        const baseAng = Math.atan2((p.y - 12) - (b.y - 26), p.x - b.x);
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 0.24;
          const spd = enraged ? 165 : 135;
          this.enemyProjectiles.push({
            x: b.x, y: b.y - 26,
            vx: Math.cos(baseAng + offset) * spd,
            vy: Math.sin(baseAng + offset) * spd,
            r: 5, color: this.biome.accent, life: 2.8,
          });
        }
      }
    }

    // Contact with player
    if (Math.abs(p.x - b.x) < 26 && p.y > b.y - b.h + 4 && p.y - p.h < b.y) {
      if (p.vy > 40 && p.y - p.vy * dt <= b.y - b.h + 14) {
        p.vy = -265;
        p.jumpsLeft = 1;
        pixelAudio.play('stomp');
        this._damageBoss(38, true);
      } else if (p.starTimer > 0) {
        this._damageBoss(25, false);
      } else {
        this._damagePlayer(1);
      }
    }
  }

  _damagePlayer(amount) {
    const p = this.player;
    if (p.hurtTimer > 0 || p.starTimer > 0 || p.dashTimer > 0 || this.gameOver) return;

    if (p.shield) {
      p.shield = false;
      p.hurtTimer = 1.0;
      pixelAudio.play('hit');
      this._addFloat(p.x, p.y - 28, '🛡️ سپر شکست!', '#38BDF8');
      this._spawnParticles(p.x, p.y - 12, 16, '#38BDF8', 110);
      this._shake(0.18, 3);
      this.onHaptic('medium');
      return;
    }

    p.hp = Math.max(0, p.hp - amount);
    p.hurtTimer = 1.15;
    this.combo = 0;
    pixelAudio.play('hurt');
    this._shake(0.24, 5);
    this._spawnParticles(p.x, p.y - 12, 14, '#EF4444', 100);
    this.onHaptic('heavy');

    if (p.hp <= 0) {
      this._triggerGameOver();
    }
    this._emitHud();
  }

  _triggerGameOver() {
    this.gameOver = true;
    pixelAudio.stopMusic();
    pixelAudio.play('gameOver');
    const duration = Math.max(1, Math.round((performance.now() - this.startTime) / 1000));
    this.onGameOver({
      score: this.score,
      distance: this.distance,
      stage_reached: this.stage,
      kills: this.kills,
      bosses_defeated: this.bossesDefeated,
      coins_earned: this.coins,
      max_combo: this.maxCombo,
      duration_seconds: duration,
    });
  }

  _pruneBehind() {
    const cut = this.cameraX - 240;
    this.grounds = this.grounds.filter((g) => g.x + g.w > cut);
    this.platforms = this.platforms.filter((pl) => pl.x + pl.w > cut);
    this.blocks = this.blocks.filter((b) => b.x + 20 > cut);
    this.chests = this.chests.filter((c) => c.x + 24 > cut);
    this.springs = this.springs.filter((s) => s.x + 20 > cut);
    this.shrines = this.shrines.filter((s) => s.x + 20 > cut);
    this.spikes = this.spikes.filter((s) => s.x + s.w > cut);
    this.props = this.props.filter((pr) => pr.x + 30 > cut);
  }

  _emitHud() {
    const p = this.player;
    this.onHudUpdate({
      hp: p.hp,
      maxHp: p.maxHp,
      shield: p.shield,
      score: this.score,
      coins: this.coins,
      distance: this.distance,
      stage: this.stage,
      biomeName: this.biome.name,
      combo: this.combo,
      rage: Math.floor(p.rage),
      dashReady: p.dashCd <= 0,
      starTimer: p.starTimer,
      feverTimer: p.feverTimer,
      magnetTimer: p.magnetTimer,
      paused: this.paused,
      gameOver: this.gameOver,
      autoRun: this.autoRun,
      boss: this.boss ? {
        name: this.boss.name,
        hp: Math.max(0, this.boss.hp),
        maxHp: this.boss.maxHp,
      } : null,
    });
  }

  // ── 6-Layer Rich Pixel Rendering ───────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const b = this.biome;

    ctx.save();
    if (this.shakeTimer > 0) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * this.shakeMag * 2),
        Math.round((Math.random() - 0.5) * this.shakeMag * 2)
      );
    }

    // Layer 1: Sky Gradient + Stars + Celestial Body + Pixel Clouds
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, b.skyTop);
    sky.addColorStop(0.55, b.skyMid);
    sky.addColorStop(1, b.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Twinkling stars
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 2.2 + s.p));
      ctx.fillStyle = `rgba(255, 250, 225, ${a.toFixed(2)})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }

    // Glowing Moon / Sun
    const sunX = 315;
    const sunY = 46;
    ctx.fillStyle = b.sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Pixel clouds
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const cl of this.clouds) {
      const cx = Math.round(cl.x);
      const cy = Math.round(cl.y);
      ctx.fillRect(cx, cy, cl.w, 6);
      ctx.fillRect(cx + 5, cy - 4, cl.w - 10, 4);
    }

    // Layer 2: Distant Mountain Peaks & Royal Castle Spires (parallax 0.14)
    this._drawParallaxMountains(ctx, 0.14, 134, 44, b.mountainFar, true);
    // Layer 3: Mid Mountains & Ruins (parallax 0.30)
    this._drawParallaxMountains(ctx, 0.30, 156, 30, b.mountainNear, false);
    // Layer 4: Foreground Hills (parallax 0.52)
    this._drawParallaxHills(ctx, 0.52, 174, b.hillColor);

    // Layer 5: World Space Entities
    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    // Ground & Platforms
    for (const g of this.grounds) drawTileBlock(ctx, g.x, g.y, g.w, g.h, b, false);
    for (const pl of this.platforms) drawTileBlock(ctx, pl.x, pl.y, pl.w, pl.h, b, true);

    // World Props (flickering torches with light glow + distance signs)
    for (const pr of this.props) {
      if (pr.x < this.cameraX - 30 || pr.x > this.cameraX + VIEW_W + 30) continue;
      if (pr.type === 'torch') {
        const rx = Math.round(pr.x);
        const ry = Math.round(pr.y);
        ctx.fillStyle = '#57361E';
        ctx.fillRect(rx - 1, ry - 15, 3, 15);
        const fl = Math.sin(this.time * 18 + pr.x) * 1.5;
        ctx.fillStyle = '#F97316';
        ctx.fillRect(rx - 2, ry - 19 + fl * 0.4, 5, 5);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(rx - 1, ry - 18 + fl * 0.4, 3, 3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(rx, ry - 17, 1, rx, ry - 17, 22);
        gr.addColorStop(0, 'rgba(251, 146, 60, 0.32)');
        gr.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = gr;
        ctx.fillRect(rx - 24, ry - 41, 48, 48);
        ctx.restore();
      } else if (pr.type === 'sign') {
        const rx = Math.round(pr.x);
        const ry = Math.round(pr.y);
        ctx.fillStyle = '#57361E';
        ctx.fillRect(rx, ry - 14, 2, 14);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(rx - 9, ry - 20, 20, 9);
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pr.label, rx + 1, ry - 13);
      }
    }

    // Mystery blocks, chests, springs, shrines, spikes
    for (const bl of this.blocks) drawMysteryBlock(ctx, bl.x, bl.y - bl.bump, bl.used, this.time);
    for (const ch of this.chests) drawChest(ctx, ch.x, ch.y, ch.opened, this.time);
    for (const sp of this.springs) drawSpring(ctx, sp.x, sp.y, sp.bounceTimer);
    for (const sh of this.shrines) drawShrine(ctx, sh.x, sh.y, sh.used, this.time);
    for (const sk of this.spikes) {
      ctx.fillStyle = '#E5E7EB';
      for (let i = 0; i < sk.w; i += 6) {
        ctx.beginPath();
        ctx.moveTo(sk.x + i, sk.y + sk.h);
        ctx.lineTo(sk.x + i + 3, sk.y);
        ctx.lineTo(sk.x + i + 6, sk.y + sk.h);
        ctx.fill();
      }
    }

    // Coins, Gems, Powerups
    for (const c of this.coinsList) drawCoin(ctx, c.x, c.y, this.time);
    for (const g of this.gems) drawGem(ctx, g.x, g.y, this.time);
    for (const pw of this.powerups) drawPowerup(ctx, pw.x, pw.y, pw.kind, this.time);

    // Enemies & Boss
    for (const e of this.enemies) drawEnemySprite(ctx, e, this.time);
    if (this.boss && !this.boss.dead) drawBossSprite(ctx, this.boss, this.time);

    // Dash afterimages
    for (const ai of this.player.afterimages) {
      drawHeroSprite(ctx, ai.x, ai.y, {
        skinId: this.skinId, weaponId: this.weaponId, facing: ai.facing,
        animTime: this.time, alpha: (ai.life / 0.16) * 0.45,
      });
    }

    // Flying Pet Companion
    drawPetSprite(ctx, this.petState.x, this.petState.y, this.petId, this.time, this.player.facing);

    // Hero Sprite
    const p = this.player;
    drawHeroSprite(ctx, p.x, p.y, {
      skinId: this.skinId,
      weaponId: this.weaponId,
      facing: p.facing,
      animTime: this.time,
      vx: p.vx,
      vy: p.vy,
      onGround: p.onGround,
      attackTimer: p.attackAnim,
      hurtTimer: p.hurtTimer,
      shield: p.shield,
      starTimer: p.starTimer,
    });

    // Crescent melee slashes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const a = s.life / s.maxLife;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 4;
      ctx.beginPath();
      const start = s.facing > 0 ? -1.1 : Math.PI - 1.1;
      ctx.arc(s.x - s.facing * 8, s.y, s.r, start, start + 2.2);
      ctx.stroke();
    }

    // Projectiles
    for (const pr of this.projectiles) {
      ctx.fillStyle = pr.glow;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = pr.color;
      if (pr.kind === 'arrow') {
        ctx.fillRect(Math.round(pr.x - 5), Math.round(pr.y - 1), 10, 2);
      } else if (pr.kind === 'thunder_wave' || pr.kind === 'scythe_wave') {
        ctx.fillRect(Math.round(pr.x - 3), Math.round(pr.y - 9), 6, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(pr.x - 1), Math.round(pr.y - 7), 2, 14);
      } else {
        ctx.fillRect(Math.round(pr.x - pr.r / 2), Math.round(pr.y - pr.r / 2), pr.r, pr.r);
      }
    }

    // Enemy projectiles
    for (const ep of this.enemyProjectiles) {
      ctx.fillStyle = ep.color;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(ep.x - 1), Math.round(ep.y - 1), 2, 2);
    }
    ctx.restore();

    // Combat particles
    for (const pt of this.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Floating damage/coin popups
    ctx.font = 'bold 8px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    for (const fl of this.floats) {
      ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.fillStyle = '#09090B';
      ctx.fillText(fl.text, Math.round(fl.x) + 1, Math.round(fl.y) + 1);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // End world space

    // Layer 6: Biome Atmospheric Particles + Ultimate Flash + Stage Banner
    for (const a of this.ambient) {
      ctx.fillStyle = b.particleColor;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.time * 4 + a.p);
      ctx.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size);
    }
    ctx.globalAlpha = 1;

    if (this.ultFlash > 0) {
      ctx.fillStyle = `rgba(254, 240, 138, ${(this.ultFlash / 0.45) * 0.55})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (this.bannerTimer > 0 && this.bannerText) {
      const alpha = Math.min(1, this.bannerTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
      ctx.fillRect(VIEW_W / 2 - 115, 22, 230, 22);
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(VIEW_W / 2 - 115, 22, 230, 22);
      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 10px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.bannerText, VIEW_W / 2, 37);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawParallaxMountains(ctx, factor, baseY, peakH, color, withCastles) {
    ctx.fillStyle = color;
    const step = 64;
    const offset = Math.floor((this.cameraX * factor) % step);
    for (let x = -step; x <= VIEW_W + step; x += step) {
      const drawX = x - offset;
      const idx = Math.floor((this.cameraX * factor + x) / step);
      const h = peakH + ((Math.abs(idx * 37) % 5) * 6);
      ctx.beginPath();
      ctx.moveTo(drawX, VIEW_H);
      ctx.lineTo(drawX + step / 2, baseY - h);
      ctx.lineTo(drawX + step, VIEW_H);
      ctx.fill();
      if (withCastles && idx % 3 === 0) {
        // Distant pixel tower silhouette
        const tx = drawX + step / 2 - 5;
        const ty = baseY - h - 10;
        ctx.fillRect(tx, ty, 10, 16);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(tx + 4, ty + 4, 2, 3);
        ctx.fillStyle = color;
      }
    }
  }

  _drawParallaxHills(ctx, factor, baseY, color) {
    ctx.fillStyle = color;
    const step = 80;
    const offset = Math.floor((this.cameraX * factor) % step);
    for (let x = -step; x <= VIEW_W + step; x += step) {
      const drawX = x - offset;
      ctx.beginPath();
      ctx.arc(drawX + step / 2, baseY + 18, 48, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(drawX, baseY + 18, step + 2, 60);
    }
  }
}

// ── Live Animated Pixel Art Banner for the Mini-Games Hub Card ───────────
export function startHubBannerLoop(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  canvas.width = 360;
  canvas.height = 132;
  ctx.imageSmoothingEnabled = false;

  let raf = null;
  let t = 0;
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const b = BIOMES[Math.floor(t / 7) % BIOMES.length];
    const sky = ctx.createLinearGradient(0, 0, 0, 132);
    sky.addColorStop(0, b.skyTop);
    sky.addColorStop(0.6, b.skyMid);
    sky.addColorStop(1, b.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 360, 132);

    // Moon + Stars
    ctx.fillStyle = b.sunGlow;
    ctx.beginPath();
    ctx.arc(290, 30, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.sunColor;
    ctx.beginPath();
    ctx.arc(290, 30, 11, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(255,250,220,${(0.3 + 0.6 * Math.abs(Math.sin(t * 2 + i))).toFixed(2)})`;
      ctx.fillRect((i * 47 + 13) % 355, (i * 23 + 7) % 68, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }

    // Scrolling mountains
    ctx.fillStyle = b.mountainFar;
    const off = (t * 18) % 60;
    for (let x = -60; x < 420; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x - off, 115);
      ctx.lineTo(x - off + 30, 56);
      ctx.lineTo(x - off + 60, 115);
      ctx.fill();
    }

    // Ground
    const gOff = (t * 68) % 16;
    drawTileBlock(ctx, -gOff, 104, 390, 30, b, false);

    // Animated coins, enemy & hero
    for (let i = 0; i < 4; i++) {
      const cx = ((360 - ((t * 68 + i * 52) % 390)) + 390) % 390 - 15;
      drawCoin(ctx, cx, 84 - Math.sin(i + t * 4) * 6, t);
    }
    drawMysteryBlock(ctx, ((220 - t * 35) % 400 + 400) % 400 - 20, 52, false, t);
    drawPetSprite(ctx, 76, 74, 'royal_dragon', t, 1, 1.15);
    drawHeroSprite(ctx, 108, 104, {
      skinId: 'celestial_emperor',
      weaponId: 'thunder_katana',
      facing: 1,
      animTime: t,
      vx: 110,
      onGround: true,
      scale: 1.25,
    });
    drawEnemySprite(ctx, { type: 'slime', x: 252, y: 104, vx: -10, w: 16, h: 13, hp: 30, maxHp: 30, hurtTimer: 0, slowTimer: 0, seed: 1 }, t);

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { if (raf) cancelAnimationFrame(raf); };
}
