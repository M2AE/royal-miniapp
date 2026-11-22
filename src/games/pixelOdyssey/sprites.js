// High-Detail Procedural Pixel Art Sprite & World Prop Renderer
import { SKIN_PALETTES, WEAPON_CONFIGS, PET_CONFIGS } from './catalog';

const px = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// ── Hero Sprite (18x24 logical pixels, crisp detail, 8 skins + 8 held weapons) ──
export function drawHeroSprite(ctx, x, y, opts = {}) {
  const {
    skinId = 'royal_knight',
    weaponId = 'iron_blade',
    facing = 1,
    animTime = 0,
    vx = 0,
    vy = 0,
    onGround = true,
    attackTimer = 0,
    hurtTimer = 0,
    shield = false,
    starTimer = 0,
    alpha = 1,
    scale = 1,
  } = opts;

  const pal = SKIN_PALETTES[skinId] || SKIN_PALETTES.royal_knight;
  const wCfg = WEAPON_CONFIGS[weaponId] || WEAPON_CONFIGS.iron_blade;

  if (hurtTimer > 0 && Math.floor(hurtTimer * 24) % 2 === 0 && alpha === 1) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);

  const running = onGround && Math.abs(vx) > 8;
  const stride = running ? Math.sin(animTime * 16) : 0;
  const bob = running ? Math.abs(Math.cos(animTime * 16)) * -1.4 : Math.sin(animTime * 3.5) * 0.6;
  const capeWave = Math.sin(animTime * 12) * 1.8 + (running ? -2.2 : 0);

  // Ground shadow
  if (onGround && alpha === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(-7, 0, 14, 2);
  }

  // Star invincibility aura or skin ambient glow
  if (starTimer > 0) {
    const hue = (animTime * 360) % 360;
    ctx.fillStyle = `hsla(${hue}, 95%, 65%, 0.35)`;
    ctx.beginPath();
    ctx.arc(0, -11, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hasVoidAura && alpha === 1) {
    ctx.fillStyle = 'rgba(217, 70, 239, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -11, 11 + Math.sin(animTime * 8) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, Math.round(bob));

  // Animated golden wings for Celestial Emperor
  if (pal.hasWings) {
    const wingY = -14 + Math.sin(animTime * 10) * 2;
    px(ctx, -13, wingY, 7, 3, '#FEF08A');
    px(ctx, -15, wingY - 2, 5, 3, '#FDE047');
    px(ctx, -12, wingY + 3, 5, 2, '#F59E0B');
  }

  // Flowing pixel cape behind body
  px(ctx, -7, -14, 4, 9, pal.capeShade);
  px(ctx, -9 + capeWave * 0.5, -11, 4, 7, pal.cape);
  px(ctx, -10 + capeWave, -6, 3, 4, pal.cape);
  px(ctx, -9 + capeWave * 0.6, -13, 2, 2, pal.helmetTrim);

  // Legs (animated stride)
  const legL = onGround ? Math.round(stride * 2.5) : -2;
  const legR = onGround ? Math.round(-stride * 2.5) : 2;
  // Back leg
  px(ctx, -3 + legL, -6, 3, 5, pal.armor);
  px(ctx, -3 + legL, -2, 4, 2, pal.boots);
  // Front leg
  px(ctx, 1 + legR, -6, 3, 5, pal.armorLight);
  px(ctx, 1 + legR, -2, 4, 2, pal.boots);

  // Torso armor + chest crest + gold belt
  px(ctx, -5, -14, 10, 9, pal.armor);
  px(ctx, -4, -14, 7, 6, pal.armorLight);
  px(ctx, -2, -13, 4, 3, pal.gold);
  px(ctx, -1, -12, 2, 2, pal.visor);
  px(ctx, -5, -7, 10, 2, pal.helmetTrim);
  px(ctx, -1, -7, 2, 2, '#FFFFFF');

  // Head + Helmet / Hood / Crown
  px(ctx, -5, -21, 10, 8, pal.helmet);
  px(ctx, -4, -22, 8, 2, pal.helmet);
  px(ctx, -3, -21, 6, 1, pal.helmetTrim);

  if (pal.headStyle === 'knight') {
    px(ctx, -2, -24, 5, 2, pal.cape);
    px(ctx, -4, -23, 3, 2, pal.helmetTrim);
    px(ctx, -2, -18, 6, 3, '#0B0B12');
    px(ctx, 0, -17, 2, 2, pal.visor);
    px(ctx, 3, -17, 1, 2, pal.visor);
  } else if (pal.headStyle === 'ninja') {
    px(ctx, -5, -19, 10, 2, pal.helmetTrim);
    px(ctx, -9 + capeWave * 0.8, -19, 4, 2, pal.helmetTrim);
    px(ctx, -2, -17, 6, 2, pal.skin);
    px(ctx, 0, -17, 2, 1, pal.visor);
    px(ctx, 3, -17, 1, 1, pal.visor);
  } else if (pal.headStyle === 'hood') {
    px(ctx, -6, -22, 10, 8, pal.helmet);
    px(ctx, -4, -23, 7, 2, pal.helmetTrim);
    px(ctx, -1, -18, 5, 4, pal.skin);
    px(ctx, 1, -17, 2, 2, pal.visor);
  } else if (pal.headStyle === 'valkyrie') {
    px(ctx, -7, -23, 3, 4, '#E0F2FE');
    px(ctx, 4, -23, 3, 4, '#E0F2FE');
    px(ctx, -2, -18, 6, 4, pal.skin);
    px(ctx, 0, -17, 2, 2, '#38BDF8');
    px(ctx, 3, -17, 1, 2, '#38BDF8');
  } else if (pal.headStyle === 'samurai') {
    px(ctx, -6, -21, 12, 2, pal.helmetTrim);
    px(ctx, -2, -24, 2, 3, pal.helmetTrim);
    px(ctx, 2, -24, 2, 3, pal.helmetTrim);
    px(ctx, -3, -18, 8, 2, pal.visor);
  } else if (pal.headStyle === 'wizard') {
    px(ctx, -7, -21, 14, 2, pal.helmet);
    px(ctx, -4, -25, 8, 4, pal.helmet);
    px(ctx, -2, -28, 4, 3, pal.helmetTrim);
    px(ctx, -3, -18, 7, 3, '#12070A');
    px(ctx, 0, -17, 2, 2, '#FDE047');
    px(ctx, 3, -17, 1, 2, '#FDE047');
  } else if (pal.headStyle === 'assassin') {
    px(ctx, -6, -22, 11, 8, pal.helmet);
    px(ctx, -4, -23, 8, 2, pal.helmetTrim);
    px(ctx, -2, -18, 6, 3, '#05020A');
    px(ctx, 0, -17, 2, 2, pal.visor);
    px(ctx, 3, -17, 2, 2, pal.visor);
  } else if (pal.headStyle === 'crown') {
    // Glowing Royal Crown
    px(ctx, -5, -24, 10, 3, '#FDE047');
    px(ctx, -5, -26, 2, 2, '#FEF08A');
    px(ctx, -1, -27, 2, 3, '#FFFFFF');
    px(ctx, 3, -26, 2, 2, '#FEF08A');
    px(ctx, -1, -23, 2, 1, '#EF4444');
    px(ctx, -2, -18, 6, 3, '#1C1408');
    px(ctx, 0, -17, 2, 2, '#FFFFFF');
    px(ctx, 3, -17, 2, 2, '#FFFFFF');
  }

  // Front Arm + Held Weapon
  const atk = attackTimer > 0 ? 1 : 0;
  px(ctx, 2, -13, 3, 5, pal.armorLight);
  px(ctx, 3, -9, 3, 2, pal.helmetTrim);

  ctx.save();
  ctx.translate(5, -10);
  if (atk) ctx.rotate(wCfg.type === 'melee' ? 0.95 : -0.18);
  drawHeldWeapon(ctx, weaponId, wCfg);
  ctx.restore();

  // Energy Shield Bubble
  if (shield && alpha === 1) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -11, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fill();
  }

  ctx.restore();
}

export function drawHeldWeapon(ctx, weaponId, cfg) {
  const c = cfg?.color || '#FDE047';
  const g = cfg?.glow || '#F59E0B';
  switch (weaponId) {
    case 'iron_blade':
      px(ctx, -1, 0, 2, 3, '#78350F');
      px(ctx, -2, -1, 5, 2, '#F59E0B');
      px(ctx, 0, -11, 2, 10, '#E5E7EB');
      px(ctx, 1, -12, 1, 10, '#FFFFFF');
      break;
    case 'emerald_bow':
      px(ctx, 1, -8, 2, 14, '#15803D');
      px(ctx, 3, -6, 2, 10, '#4ADE80');
      px(ctx, 0, -7, 1, 12, '#E5E7EB');
      px(ctx, 0, -2, 8, 1, '#FEF08A');
      break;
    case 'frost_shuriken':
      px(ctx, 1, -4, 6, 2, '#67E8F9');
      px(ctx, 3, -6, 2, 6, '#ECFEFF');
      px(ctx, 3, -4, 2, 2, '#0284C7');
      break;
    case 'fire_staff':
      px(ctx, 0, -10, 2, 14, '#78350F');
      px(ctx, -1, -14, 4, 4, '#EF4444');
      px(ctx, 0, -13, 2, 2, '#FEF08A');
      break;
    case 'thunder_katana':
      px(ctx, -1, 0, 2, 3, '#312E81');
      px(ctx, -2, -1, 5, 1, '#C084FC');
      px(ctx, 0, -13, 2, 12, '#DDD6FE');
      px(ctx, 1, -14, 1, 11, '#FFFFFF');
      break;
    case 'vampire_scythe':
      px(ctx, 0, -12, 2, 16, '#3F1D2B');
      px(ctx, 0, -13, 9, 3, '#E11D48');
      px(ctx, 6, -10, 3, 4, '#FB7185');
      px(ctx, 2, -13, 5, 1, '#FFE4E6');
      break;
    case 'nova_boomerang':
      px(ctx, 0, -7, 7, 2, '#38BDF8');
      px(ctx, 5, -7, 2, 7, '#818CF8');
      px(ctx, 2, -6, 3, 2, '#FFFFFF');
      break;
    case 'celestial_cannon':
      px(ctx, -1, -4, 11, 6, '#B45309');
      px(ctx, 1, -3, 8, 4, '#F59E0B');
      px(ctx, 8, -4, 3, 6, '#FEF08A');
      px(ctx, 3, -2, 4, 2, '#FFFFFF');
      break;
    default:
      px(ctx, 0, -10, 2, 10, c);
      px(ctx, -1, -1, 4, 2, g);
  }
}

// ── Flying Pet Companions ────────────────────────────────────────────────
export function drawPetSprite(ctx, x, y, petId, animTime = 0, facing = 1, scale = 1) {
  if (!petId || petId === 'none') return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + Math.sin(animTime * 6) * 2.5));
  ctx.scale(facing * scale, scale);
  const flap = Math.sin(animTime * 15) > 0 ? -2 : 1;

  if (petId === 'golden_owl') {
    px(ctx, -5, -4, 10, 8, '#D97706');
    px(ctx, -4, -3, 8, 6, '#FACC15');
    px(ctx, -3, -2, 6, 4, '#FEF9C3');
    px(ctx, -8, -2 + flap, 3, 4, '#B45309');
    px(ctx, 5, -2 + flap, 3, 4, '#B45309');
    px(ctx, -2, -2, 2, 2, '#09090B');
    px(ctx, 1, -2, 2, 2, '#09090B');
    px(ctx, 0, 0, 1, 2, '#F97316');
  } else if (petId === 'ember_wisp') {
    ctx.fillStyle = 'rgba(251,146,60,0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, -4, -5, 8, 9, '#EA580C');
    px(ctx, -3, -7 + flap * 0.5, 6, 4, '#FB923C');
    px(ctx, -2, -3, 5, 5, '#FDE047');
    px(ctx, 0, -2, 2, 2, '#FFFFFF');
    px(ctx, 3, -2, 1, 2, '#FFFFFF');
  } else if (petId === 'royal_dragon') {
    // Wing
    px(ctx, -6, -7 + flap, 6, 5, '#7E22CE');
    px(ctx, -5, -6 + flap, 4, 3, '#FDE047');
    // Body + Tail
    px(ctx, -7, 1, 4, 2, '#B45309');
    px(ctx, -4, -3, 9, 6, '#D97706');
    px(ctx, -2, -1, 6, 3, '#FEF08A');
    // Head + Golden Horns
    px(ctx, 3, -6, 6, 5, '#F59E0B');
    px(ctx, 4, -8, 1, 2, '#FEF08A');
    px(ctx, 6, -8, 1, 2, '#FEF08A');
    px(ctx, 6, -5, 2, 2, '#FFFFFF');
  }
  ctx.restore();
}

// ── 7 Distinct Enemy Types ───────────────────────────────────────────────
export function drawEnemySprite(ctx, e, animTime = 0) {
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  const facing = e.vx <= 0 ? -1 : 1;
  ctx.scale(facing, 1);

  const flash = e.hurtTimer > 0;
  const frozen = e.slowTimer > 0;
  const f = Math.sin(animTime * 11 + e.seed);

  if (e.type === 'slime') {
    const sq = Math.round(f * 1.4);
    px(ctx, -8, -11 - sq, 16, 11 + sq, flash ? '#FFF' : frozen ? '#38BDF8' : '#16A34A');
    px(ctx, -6, -13 - sq, 12, 4, flash ? '#FFF' : frozen ? '#7DD3FC' : '#4ADE80');
    px(ctx, -4, -10 - sq, 3, 2, '#BBF7D0');
    px(ctx, 1, -8 - sq, 2, 3, '#09090B');
    px(ctx, 5, -8 - sq, 2, 3, '#09090B');
  } else if (e.type === 'goblin') {
    const leg = Math.round(f * 2.5);
    px(ctx, -4 + leg, -5, 3, 5, '#3F6212');
    px(ctx, 1 - leg, -5, 3, 5, '#3F6212');
    px(ctx, -5, -13, 10, 8, flash ? '#FFF' : frozen ? '#38BDF8' : '#65A30D');
    px(ctx, -5, -19, 10, 7, flash ? '#FFF' : frozen ? '#7DD3FC' : '#84CC16');
    px(ctx, -8, -17, 3, 2, '#84CC16');
    px(ctx, 1, -17, 2, 2, '#EF4444');
    px(ctx, 4, -17, 2, 2, '#EF4444');
    px(ctx, 5, -12, 6, 2, '#D4D4D8');
  } else if (e.type === 'skeleton') {
    const leg = Math.round(f * 2);
    px(ctx, -3 + leg, -6, 2, 6, '#E5E7EB');
    px(ctx, 2 - leg, -6, 2, 6, '#E5E7EB');
    px(ctx, -4, -14, 8, 8, flash ? '#FFF' : frozen ? '#7DD3FC' : '#D4D4D8');
    px(ctx, -3, -12, 6, 1, '#18181B');
    px(ctx, -3, -10, 6, 1, '#18181B');
    px(ctx, -4, -21, 8, 7, '#F4F4F5');
    px(ctx, 0, -19, 2, 2, '#EF4444');
    px(ctx, 3, -19, 2, 2, '#EF4444');
    // Bow
    px(ctx, 5, -17, 2, 10, '#92400E');
    px(ctx, 4, -16, 1, 8, '#E5E7EB');
  } else if (e.type === 'bat') {
    const flap = Math.round(Math.sin(animTime * 20 + e.seed) * 4);
    px(ctx, -11, -10 + flap, 7, 4, flash ? '#FFF' : frozen ? '#38BDF8' : '#581C87');
    px(ctx, 4, -10 + flap, 7, 4, flash ? '#FFF' : frozen ? '#38BDF8' : '#581C87');
    px(ctx, -4, -12, 8, 7, flash ? '#FFF' : '#7E22CE');
    px(ctx, -4, -15, 2, 3, '#A855F7');
    px(ctx, 2, -15, 2, 3, '#A855F7');
    px(ctx, -2, -10, 2, 2, '#F43F5E');
    px(ctx, 2, -10, 2, 2, '#F43F5E');
  } else if (e.type === 'golem') {
    const step = Math.round(f * 1.5);
    px(ctx, -7 + step, -7, 5, 7, '#334155');
    px(ctx, 2 - step, -7, 5, 7, '#334155');
    px(ctx, -10, -21, 20, 15, flash ? '#FFF' : frozen ? '#38BDF8' : '#475569');
    px(ctx, -8, -19, 16, 10, flash ? '#FFF' : '#64748B');
    px(ctx, -4, -16, 8, 3, '#F59E0B');
    px(ctx, -6, -26, 12, 6, '#334155');
    px(ctx, 0, -24, 5, 2, '#FACC15');
  } else if (e.type === 'imp') {
    const hov = Math.round(f * 2);
    px(ctx, -9, -14 + hov, 5, 4, '#991B1B');
    px(ctx, 4, -14 + hov, 5, 4, '#991B1B');
    px(ctx, -5, -16 + hov, 10, 10, flash ? '#FFF' : frozen ? '#38BDF8' : '#DC2626');
    px(ctx, -4, -20 + hov, 2, 4, '#FDE047');
    px(ctx, 2, -20 + hov, 2, 4, '#FDE047');
    px(ctx, 0, -13 + hov, 2, 2, '#FEF08A');
    px(ctx, 3, -13 + hov, 2, 2, '#FEF08A');
  } else if (e.type === 'turret') {
    px(ctx, -8, -6, 16, 6, '#312E81');
    px(ctx, -6, -16, 12, 10, flash ? '#FFF' : '#4C1D95');
    px(ctx, -4, -21, 8, 6, '#A855F7');
    px(ctx, 2, -19, 6, 3, '#E879F9');
  }

  ctx.restore();

  // Enemy HP bar when damaged
  if (e.hp < e.maxHp && e.hp > 0) {
    const bw = Math.max(16, e.w);
    const bx = Math.round(e.x - bw / 2);
    const by = Math.round(e.y - e.h - 7);
    px(ctx, bx, by, bw, 3, 'rgba(0,0,0,0.75)');
    px(ctx, bx + 1, by + 1, Math.max(1, (bw - 2) * (e.hp / e.maxHp)), 1, '#EF4444');
  }
}

// ── 5 Detailed Multi-Phase Bosses ────────────────────────────────────────
export function drawBossSprite(ctx, boss, animTime = 0) {
  ctx.save();
  ctx.translate(Math.round(boss.x), Math.round(boss.y));
  const flash = boss.hurtTimer > 0;
  const enraged = boss.hp < boss.maxHp * 0.5;
  const pulse = Math.sin(animTime * (enraged ? 14 : 7));

  if (enraged) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -boss.h * 0.5, boss.w * 0.72 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (boss.bossType === 'king_slime') {
    const sq = Math.round(pulse * 2.5);
    px(ctx, -20, -28 - sq, 40, 28 + sq, flash ? '#FFF' : '#15803D');
    px(ctx, -16, -34 - sq, 32, 12, flash ? '#FFF' : '#22C55E');
    px(ctx, -12, -30 - sq, 8, 4, '#86EFAC');
    // Golden Crown
    px(ctx, -10, -42 - sq, 20, 7, '#F59E0B');
    px(ctx, -10, -47 - sq, 4, 5, '#FEF08A');
    px(ctx, -2, -49 - sq, 4, 7, '#FEF08A');
    px(ctx, 6, -47 - sq, 4, 5, '#FEF08A');
    px(ctx, -2, -40 - sq, 4, 3, '#EF4444');
    // Angry eyes
    px(ctx, -10, -22 - sq, 5, 5, '#09090B');
    px(ctx, 2, -22 - sq, 5, 5, '#09090B');
    px(ctx, -9, -21 - sq, 2, 2, '#FEF08A');
    px(ctx, 3, -21 - sq, 2, 2, '#FEF08A');
  } else if (boss.bossType === 'ancient_treant') {
    px(ctx, -18, -42, 36, 42, flash ? '#FFF' : '#451A03');
    px(ctx, -14, -38, 28, 34, flash ? '#FFF' : '#78350F');
    px(ctx, -24, -52, 48, 16, '#15803D');
    px(ctx, -18, -58, 36, 10, '#22C55E');
    px(ctx, -10, -30, 6, 4, '#4ADE80');
    px(ctx, 4, -30, 6, 4, '#4ADE80');
    px(ctx, -6, -18, 12, 6, '#1C1917');
  } else if (boss.bossType === 'crystal_lich') {
    const hov = Math.round(pulse * 4);
    px(ctx, -16, -42 + hov, 32, 36, flash ? '#FFF' : '#4C1D95');
    px(ctx, -12, -38 + hov, 24, 26, '#7E22CE');
    px(ctx, -14, -52 + hov, 28, 14, '#E879F9');
    px(ctx, -6, -58 + hov, 12, 8, '#F5D0FE');
    px(ctx, -8, -45 + hov, 5, 4, '#FFFFFF');
    px(ctx, 3, -45 + hov, 5, 4, '#FFFFFF');
    px(ctx, -22, -34 + hov, 6, 14, '#C084FC');
    px(ctx, 16, -34 + hov, 6, 14, '#C084FC');
  } else if (boss.bossType === 'obsidian_wyrm') {
    const flap = Math.round(pulse * 6);
    px(ctx, -28, -40 + flap, 18, 12, '#7F1D1D');
    px(ctx, 10, -40 + flap, 18, 12, '#7F1D1D');
    px(ctx, -16, -44, 32, 36, flash ? '#FFF' : '#1F141A');
    px(ctx, -12, -40, 24, 24, '#450A0A');
    px(ctx, -14, -54, 24, 14, '#27171F');
    px(ctx, -10, -60, 4, 7, '#F97316');
    px(ctx, 4, -60, 4, 7, '#F97316');
    px(ctx, -10, -48, 5, 4, '#FDE047');
    px(ctx, 1, -48, 5, 4, '#FDE047');
  } else {
    // solar_sovereign
    const hov = Math.round(pulse * 3);
    px(ctx, -26, -44 + hov, 14, 10, '#FDE047');
    px(ctx, 12, -44 + hov, 14, 10, '#FDE047');
    px(ctx, -16, -46 + hov, 32, 38, flash ? '#FFF' : '#B45309');
    px(ctx, -12, -42 + hov, 24, 28, '#F59E0B');
    px(ctx, -10, -56 + hov, 20, 12, '#FEF08A');
    px(ctx, -4, -62 + hov, 8, 6, '#FFFFFF');
    px(ctx, -6, -51 + hov, 4, 3, '#09090B');
    px(ctx, 2, -51 + hov, 4, 3, '#09090B');
  }

  ctx.restore();
}

// ── World Props & Interactive Blocks ─────────────────────────────────────
export function drawTileBlock(ctx, x, y, w, h, biome, isFloating = false) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  px(ctx, rx, ry, w, h, biome.tileDirt);
  px(ctx, rx, ry + 5, w, Math.max(0, h - 5), biome.tileDirtDark);
  // Textured brick/earth speckles
  ctx.fillStyle = biome.tileStone;
  for (let tx = 4; tx < w - 4; tx += 14) {
    ctx.fillRect(rx + tx, ry + 8, 5, 3);
    if (h > 18) ctx.fillRect(rx + tx + 5, ry + 16, 4, 3);
  }
  // Top grass/crystal/gold cap
  px(ctx, rx, ry, w, 5, biome.tileTop);
  px(ctx, rx, ry, w, 2, biome.tileTopLight);
  px(ctx, rx, ry + 4, w, 2, biome.tileTopDark);
  if (isFloating) {
    px(ctx, rx, ry + h - 2, w, 2, 'rgba(0,0,0,0.45)');
    px(ctx, rx + 2, ry + 6, w - 4, 1, 'rgba(255,255,255,0.12)');
  }
}

export function drawMysteryBlock(ctx, x, y, used, animTime) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (used) {
    px(ctx, rx, ry, 16, 16, '#3F3F46');
    px(ctx, rx + 1, ry + 1, 14, 14, '#27272A');
    px(ctx, rx + 2, ry + 2, 2, 2, '#52525B');
    px(ctx, rx + 12, ry + 2, 2, 2, '#52525B');
    return;
  }
  const shine = Math.sin(animTime * 6) > 0;
  px(ctx, rx, ry, 16, 16, '#92400E');
  px(ctx, rx + 1, ry + 1, 14, 14, shine ? '#F59E0B' : '#D97706');
  px(ctx, rx + 2, ry + 2, 12, 2, '#FEF08A');
  // Pixel "?"
  px(ctx, rx + 5, ry + 4, 6, 2, '#FFFBEB');
  px(ctx, rx + 9, ry + 6, 2, 2, '#FFFBEB');
  px(ctx, rx + 7, ry + 8, 2, 2, '#FFFBEB');
  px(ctx, rx + 7, ry + 11, 2, 2, '#FFFBEB');
}

export function drawChest(ctx, x, y, opened, animTime) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  px(ctx, rx, ry, 18, 13, '#78350F');
  px(ctx, rx + 1, ry + 1, 16, 11, '#92400E');
  px(ctx, rx, ry + 4, 18, 2, '#F59E0B');
  px(ctx, rx + 7, ry + 3, 4, 4, '#FEF08A');
  if (opened) {
    px(ctx, rx, ry - 4, 18, 5, '#B45309');
    px(ctx, rx + 2, ry + 1, 14, 3, '#FDE047');
  } else if (Math.sin(animTime * 5) > 0.3) {
    px(ctx, rx + 8, ry - 4, 2, 2, '#FEF08A');
  }
}

export function drawSpring(ctx, x, y, bounceTimer) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const ext = bounceTimer > 0 ? 5 : 0;
  px(ctx, rx, ry + 6, 14, 3, '#52525B');
  px(ctx, rx + 3, ry + 2 - ext, 8, 4 + ext, '#D4D4D8');
  px(ctx, rx, ry - ext, 14, 3, '#EF4444');
  px(ctx, rx + 2, ry - ext, 10, 1, '#FCA5A5');
}

export function drawShrine(ctx, x, y, used, animTime) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  px(ctx, rx - 8, ry - 4, 16, 4, '#52525B');
  px(ctx, rx - 5, ry - 20, 10, 16, '#3F3F46');
  px(ctx, rx - 6, ry - 22, 12, 3, '#F59E0B');
  if (!used) {
    const fl = Math.sin(animTime * 10) * 1.5;
    px(ctx, rx - 3, ry - 29 + fl, 6, 6, '#34D399');
    px(ctx, rx - 1, ry - 27 + fl, 2, 3, '#ECFDF5');
  }
}

export function drawCoin(ctx, x, y, animTime) {
  const phase = Math.abs(Math.cos(animTime * 7 + x * 0.05));
  const w = Math.max(2, Math.round(8 * phase));
  const rx = Math.round(x - w / 2);
  const ry = Math.round(y - 4);
  px(ctx, rx, ry, w, 8, '#D97706');
  if (w >= 4) {
    px(ctx, rx + 1, ry + 1, w - 2, 6, '#FACC15');
    px(ctx, rx + 1, ry + 1, Math.max(1, w - 4), 2, '#FEF9C3');
  }
}

export function drawGem(ctx, x, y, animTime) {
  const bob = Math.sin(animTime * 6 + x * 0.1) * 1.8;
  const rx = Math.round(x);
  const ry = Math.round(y + bob);
  px(ctx, rx - 4, ry - 3, 8, 6, '#A855F7');
  px(ctx, rx - 2, ry - 5, 4, 10, '#E879F9');
  px(ctx, rx - 1, ry - 3, 2, 3, '#FFFFFF');
}

export function drawPowerup(ctx, x, y, kind, animTime) {
  const bob = Math.sin(animTime * 5 + x * 0.1) * 2;
  const rx = Math.round(x);
  const ry = Math.round(y + bob);
  if (kind === 'heart') {
    px(ctx, rx - 5, ry - 4, 4, 4, '#EF4444');
    px(ctx, rx + 1, ry - 4, 4, 4, '#EF4444');
    px(ctx, rx - 5, ry - 1, 10, 3, '#DC2626');
    px(ctx, rx - 3, ry + 2, 6, 2, '#DC2626');
    px(ctx, rx - 1, ry + 4, 2, 2, '#991B1B');
    px(ctx, rx - 4, ry - 3, 2, 1, '#FCA5A5');
  } else if (kind === 'shield') {
    px(ctx, rx - 5, ry - 5, 10, 7, '#0284C7');
    px(ctx, rx - 3, ry + 2, 6, 3, '#0284C7');
    px(ctx, rx - 3, ry - 3, 6, 4, '#7DD3FC');
  } else if (kind === 'magnet') {
    px(ctx, rx - 5, ry - 5, 3, 9, '#EF4444');
    px(ctx, rx + 2, ry - 5, 3, 9, '#3B82F6');
    px(ctx, rx - 5, ry + 2, 10, 3, '#E5E7EB');
  } else if (kind === 'star') {
    const hue = (animTime * 220) % 360;
    px(ctx, rx - 2, ry - 6, 4, 12, `hsl(${hue}, 95%, 65%)`);
    px(ctx, rx - 6, ry - 2, 12, 4, `hsl(${hue}, 95%, 65%)`);
    px(ctx, rx - 2, ry - 2, 4, 4, '#FFFFFF');
  } else if (kind === 'fever') {
    px(ctx, rx - 5, ry - 5, 10, 10, '#F59E0B');
    px(ctx, rx - 3, ry - 3, 6, 6, '#FEF08A');
    px(ctx, rx - 1, ry - 2, 2, 4, '#09090B');
  }
}

// ── Shop Item Preview Canvas Helper ──────────────────────────────────────
export function renderShopItemPreview(canvas, itemType, itemId, t = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Subtle dark royal vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.65);
  grad.addColorStop(0, 'rgba(212, 175, 55, 0.16)');
  grad.addColorStop(1, 'rgba(11, 11, 16, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (itemType === 'skin') {
    drawHeroSprite(ctx, w / 2, h - 10, {
      skinId: itemId,
      weaponId: 'iron_blade',
      facing: 1,
      animTime: t,
      vx: 30,
      onGround: true,
      scale: 2.1,
    });
  } else if (itemType === 'weapon') {
    const cfg = WEAPON_CONFIGS[itemId] || WEAPON_CONFIGS.iron_blade;
    ctx.save();
    ctx.translate(w / 2 - 4, h / 2 + 12);
    ctx.scale(2.8, 2.8);
    ctx.rotate(Math.sin(t * 2.5) * 0.15);
    drawHeldWeapon(ctx, itemId, cfg);
    ctx.restore();
  } else if (itemType === 'pet') {
    if (itemId === 'none') {
      ctx.fillStyle = '#52525B';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('—', w / 2, h / 2);
    } else {
      drawPetSprite(ctx, w / 2, h / 2 + 2, itemId, t, 1, 2.6);
    }
  }
}
