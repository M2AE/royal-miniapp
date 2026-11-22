import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import {
  ArrowRight,
  Award,
  Check,
  Crown,
  Flame,
  Gamepad2,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { api } from '../../api';
import GoldButton from '../../components/GoldButton';
import Avatar from '../../components/Avatar';
import { GAME_ID, PET_CONFIGS, RARITY_STYLES, SKIN_PALETTES, WEAPON_CONFIGS } from './catalog';
import { pixelAudio } from './audio';
import { PixelOdysseyEngine } from './engine';
import { renderShopItemPreview } from './sprites';

function ItemPreviewCanvas({ itemType, itemId, className = 'w-16 h-16' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = 64;
    canvas.height = 64;
    let raf = null;
    const start = performance.now();
    const loop = (now) => {
      renderShopItemPreview(canvas, itemType, itemId, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [itemType, itemId]);

  return (
    <canvas
      ref={ref}
      className={`pixel-canvas rounded-2xl border border-amber-400/20 bg-[#0B0B10] mx-auto ${className}`}
    />
  );
}

export default function PixelOdysseyGame({ user, apiBase = '', onExit }) {
  const [subTab, setSubTab] = useState('play'); // 'play' | 'shop' | 'leaderboard' | 'quests'
  const [shopCat, setShopCat] = useState('skins'); // 'skins' | 'weapons' | 'pets' | 'upgrades'
  const [stateData, setStateData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  // Live Game State
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [hud, setHud] = useState({
    hp: 4, maxHp: 4, shield: false, score: 0, coins: 0, distance: 0,
    stage: 1, biomeName: 'دشت طلایی رویال', combo: 0, rage: 25,
    dashReady: true, starTimer: 0, feverTimer: 0, magnetTimer: 0,
    paused: false, gameOver: false, autoRun: false, boss: null,
  });
  const [gameOverResult, setGameOverResult] = useState(null);
  const [savingRun, setSavingRun] = useState(false);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const triggerHaptic = useCallback((style = 'light') => {
    try {
      WebApp.HapticFeedback.impactOccurred(style);
    } catch (_) { /* outside Telegram */ }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get(`${apiBase}/api/v1/minigames/${GAME_ID}/state`);
      setStateData(res.data);
    } catch (err) {
      console.error('Failed to load minigame state', err);
      showToast('error', 'خطا در بارگذاری اطلاعات بازی از سرور');
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get(`${apiBase}/api/v1/minigames/${GAME_ID}/leaderboard?limit=50`);
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Failed to load game leaderboard', err);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (subTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [subTab, fetchLeaderboard]);

  const handleRunFinished = useCallback(async (summary) => {
    setSavingRun(true);
    setGameOverResult({ summary, server: null });
    try {
      const res = await api.post(`${apiBase}/api/v1/minigames/${GAME_ID}/runs`, summary);
      setGameOverResult({ summary, server: res.data });
      if (res.data?.profile) {
        setStateData((prev) => (prev ? { ...prev, profile: res.data.profile } : prev));
      }
      fetchState();
    } catch (err) {
      console.error('Failed to submit run', err);
      showToast('error', 'ثبت امتیاز روی سرور ناموفق بود.');
    } finally {
      setSavingRun(false);
    }
  }, [apiBase, fetchState, showToast]);

  // Mount & start/stop engine when playing
  useEffect(() => {
    if (subTab !== 'play' || !isPlaying || !canvasRef.current || !stateData?.profile) return;

    const prof = stateData.profile;
    const engine = new PixelOdysseyEngine(canvasRef.current, {
      skinId: prof.equipped_skin,
      weaponId: prof.equipped_weapon,
      petId: prof.equipped_pet || 'none',
      upgrades: prof.upgrades,
      autoRun,
      onHudUpdate: setHud,
      onGameOver: handleRunFinished,
      onHaptic: triggerHaptic,
    });
    engineRef.current = engine;
    pixelAudio.setMuted(muted);
    engine.start();

    const onKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); engine.setMove('left', true); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); engine.setMove('right', true); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { e.preventDefault(); engine.triggerJump(); }
      else if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'KeyF') { e.preventDefault(); engine.triggerAttack(); }
      else if (e.code === 'KeyK' || e.code === 'KeyX' || e.code === 'ShiftLeft') { e.preventDefault(); engine.triggerDash(); }
      else if (e.code === 'KeyE' || e.code === 'KeyQ') { e.preventDefault(); engine.triggerUltimate(); }
      else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); engine.togglePause(); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.setMove('left', false);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.setMove('right', false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      engine.stop();
      engineRef.current = null;
    };
  }, [subTab, isPlaying]);

  const startNewRun = () => {
    setGameOverResult(null);
    setSubTab('play');
    if (isPlaying && engineRef.current && stateData?.profile) {
      const p = stateData.profile;
      engineRef.current.applyLoadout({
        skinId: p.equipped_skin,
        weaponId: p.equipped_weapon,
        petId: p.equipped_pet || 'none',
        upgrades: p.upgrades,
        autoRun,
      });
      engineRef.current.start();
    } else {
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    pixelAudio.setMuted(next);
    if (!next && isPlaying && !hud.paused && !hud.gameOver) {
      pixelAudio.startMusic(Boolean(hud.boss));
    }
  };

  const toggleAutoRun = () => {
    const next = !autoRun;
    setAutoRun(next);
    if (engineRef.current) engineRef.current.setAutoRun(next);
    triggerHaptic('light');
  };

  // Shop Actions
  const handleBuy = async (itemType, itemId) => {
    try {
      setBusyId(`${itemType}:${itemId}`);
      const res = await api.post(`${apiBase}/api/v1/minigames/${GAME_ID}/shop/buy`, {
        item_type: itemType,
        item_id: itemId,
      });
      if (res.data?.profile) {
        setStateData((prev) => (prev ? { ...prev, profile: res.data.profile } : prev));
      }
      pixelAudio.play('buy');
      triggerHaptic('medium');
      showToast('success', res.data?.message || 'خرید انجام شد!');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'خطا در خرید آیتم';
      showToast('error', msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (itemType, itemId) => {
    try {
      setBusyId(`equip:${itemType}:${itemId}`);
      const res = await api.post(`${apiBase}/api/v1/minigames/${GAME_ID}/equip`, {
        item_type: itemType,
        item_id: itemId,
      });
      if (res.data?.profile) {
        setStateData((prev) => (prev ? { ...prev, profile: res.data.profile } : prev));
      }
      triggerHaptic('light');
      showToast('success', res.data?.message || 'تجهیز شد!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'خطا در تجهیز آیتم';
      showToast('error', msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleClaimQuest = async (questId) => {
    try {
      setBusyId(`quest:${questId}`);
      const res = await api.post(`${apiBase}/api/v1/minigames/${GAME_ID}/quests/claim`, {
        quest_id: questId,
      });
      if (res.data?.profile) {
        setStateData((prev) => (prev ? { ...prev, profile: res.data.profile } : prev));
      }
      pixelAudio.play('buy');
      triggerHaptic('medium');
      showToast('success', res.data?.message || 'جایزه دریافت شد!');
    } catch (err) {
      showToast('error', err.response?.data?.message || err.response?.data?.detail || 'خطا در دریافت جایزه');
    } finally {
      setBusyId(null);
    }
  };

  const profile = stateData?.profile;
  const shop = stateData?.shop;

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin border-amber-400" />
        <span className="text-xs text-gray-400">در حال بارگذاری ادیسه پیکسلی رویال...</span>
      </div>
    );
  }

  const claimableQuests = (profile?.daily_quests || []).filter((q) => q.completed && !q.claimed).length;

  return (
    <div className="max-w-md mx-auto px-3 pt-3 pb-8 space-y-3 select-none" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-3 left-3 right-3 max-w-md mx-auto z-50 glass-card px-4 py-2.5 flex items-center gap-2 text-xs shadow-2xl ${
              toast.type === 'success' ? 'border-amber-400/70' : 'border-red-500/70'
            }`}
          >
            <Sparkles size={15} className={toast.type === 'success' ? 'text-amber-300' : 'text-red-400'} />
            <span className="text-gray-100">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Back + Title + Game Coins */}
      <div className="glass-card px-3.5 py-2.5 flex items-center justify-between">
        <button
          onClick={() => {
            if (engineRef.current) engineRef.current.stop();
            onExit();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-amber-300 active:scale-95 transition"
        >
          <ArrowRight size={16} />
          <span>بازی‌ها</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-black gold-text">ادیسه پیکسلی رویال</div>
          <div className="text-[10px] text-gray-400">رکورد: {(profile?.high_score || 0).toLocaleString()}</div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#191922] border border-amber-400/30 rounded-xl px-2.5 py-1">
          <span className="text-xs font-black gold-text tabular-nums">
            {(profile?.game_coins || 0).toLocaleString()}
          </span>
          <span className="text-xs">🪙</span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#111116] p-1 rounded-2xl border border-amber-500/15">
        {[
          { id: 'play', label: 'بازی', icon: Gamepad2 },
          { id: 'shop', label: 'فروشگاه', icon: ShoppingBag },
          { id: 'leaderboard', label: 'لیدربرد', icon: Trophy },
          { id: 'quests', label: 'مأموریت', icon: Award, badge: claimableQuests },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id !== 'play' && engineRef.current) {
                  engineRef.current.stop();
                  setIsPlaying(false);
                }
                setSubTab(t.id);
                triggerHaptic('light');
              }}
              className={`relative py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                active
                  ? 'gold-gradient text-obsidian shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              {t.badge > 0 && !active && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════ PLAY TAB ═══════════════════ */}
      {subTab === 'play' && (
        <div className="space-y-2.5">
          {!isPlaying ? (
            /* Pre-run Ready Lobby */
            <div className="glass-card p-5 text-center space-y-4 relative overflow-hidden">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-36 bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <ItemPreviewCanvas itemType="skin" itemId={profile?.equipped_skin || 'royal_knight'} className="w-20 h-20" />
                  <div className="text-[11px] font-bold text-white mt-1.5">
                    {(SKIN_PALETTES[profile?.equipped_skin] || SKIN_PALETTES.royal_knight).name}
                  </div>
                </div>
                <div className="text-center">
                  <ItemPreviewCanvas itemType="weapon" itemId={profile?.equipped_weapon || 'iron_blade'} className="w-16 h-16" />
                  <div className="text-[11px] font-bold text-amber-300 mt-1.5">
                    {(WEAPON_CONFIGS[profile?.equipped_weapon] || WEAPON_CONFIGS.iron_blade).name}
                  </div>
                </div>
                {profile?.equipped_pet && profile.equipped_pet !== 'none' && (
                  <div className="text-center">
                    <ItemPreviewCanvas itemType="pet" itemId={profile.equipped_pet} className="w-16 h-16" />
                    <div className="text-[11px] font-bold text-purple-300 mt-1.5">
                      {(PET_CONFIGS[profile.equipped_pet] || PET_CONFIGS.none).name}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#16161E] border border-white/5 p-2.5">
                  <div className="text-sm font-black gold-text tabular-nums">{(profile?.high_score || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400">بهترین امتیاز</div>
                </div>
                <div className="rounded-xl bg-[#16161E] border border-white/5 p-2.5">
                  <div className="text-sm font-black text-emerald-400 tabular-nums">مرحله {profile?.max_stage || 1}</div>
                  <div className="text-[10px] text-gray-400">بالاترین قلمرو</div>
                </div>
                <div className="rounded-xl bg-[#16161E] border border-white/5 p-2.5">
                  <div className="text-sm font-black text-sky-400 tabular-nums">
                    {profile?.games_played > 0 ? `#${profile.rank}` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-400">رتبه جهانی</div>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 leading-6 bg-black/30 rounded-xl p-3 border border-white/5">
                روی سر دشمنان بپر یا با اسلحه‌ات نابودشان کن، بلوک‌های <b className="text-amber-300">?</b> و صندوقچه‌ها را باز کن، نوار <b className="text-amber-300">⚡ خشم</b> را پر کن و باس هر قلمرو را شکست بده!
              </div>

              <GoldButton fullWidth onClick={startNewRun} className="py-3.5 text-base shadow-[0_6px_28px_rgba(212,175,55,0.3)]">
                <Play size={18} className="fill-obsidian" />
                <span>شروع ماجراجویی پیکسلی</span>
              </GoldButton>
            </div>
          ) : (
            /* Active Game Canvas & Controls */
            <>
              {/* Live HUD Strip */}
              <div className="glass-card px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  {/* Hearts & Shield */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: hud.maxHp }).map((_, i) => (
                      <Heart
                        key={i}
                        size={14}
                        className={i < hud.hp ? 'text-red-500 fill-red-500' : 'text-zinc-700'}
                      />
                    ))}
                    {hud.shield && <Shield size={14} className="text-sky-400 fill-sky-400/30 mr-1" />}
                  </div>

                  {/* Score + Coins + Stage */}
                  <div className="flex items-center gap-2.5 tabular-nums font-bold">
                    <span className="text-amber-300">{hud.coins} 🪙</span>
                    <span className="text-white">{hud.score.toLocaleString()}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-200">
                      م{hud.stage} · {hud.distance}m
                    </span>
                  </div>

                  {/* Mute + AutoRun + Pause */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleAutoRun}
                      title="دویدن خودکار"
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border ${
                        autoRun
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      AUTO
                    </button>
                    <button onClick={toggleMute} className="p-1 rounded-lg bg-white/5 text-gray-300">
                      {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <button
                      onClick={() => engineRef.current?.togglePause()}
                      className="p-1 rounded-lg bg-white/5 text-gray-300"
                    >
                      {hud.paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                  </div>
                </div>

                {/* Rage/Ultimate Bar + Active Buffs */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-amber-500/20">
                    <div
                      className={`h-full transition-all duration-150 ${
                        hud.rage >= 100
                          ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 animate-pulse'
                          : 'bg-gradient-to-r from-purple-600 to-amber-400'
                      }`}
                      style={{ width: `${hud.rage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-amber-300 tabular-nums w-12 text-left">
                    ⚡ {hud.rage}%
                  </span>
                  {hud.combo >= 2 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-500/25 text-orange-300 border border-orange-400/40">
                      {hud.combo}x کمبو
                    </span>
                  )}
                </div>

                {/* Boss HP Bar */}
                {hud.boss && (
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-red-300">
                      <span>👑 باس: {hud.boss.name}</span>
                      <span className="tabular-nums">{hud.boss.hp} / {hud.boss.maxHp}</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-red-500/40">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-100"
                        style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Crisp Pixel Art Viewport */}
              <div className="relative rounded-3xl overflow-hidden border border-amber-400/35 shadow-[0_0_30px_rgba(212,175,55,0.16)] bg-black">
                <canvas
                  ref={canvasRef}
                  className="pixel-canvas w-full block aspect-[400/232] touch-none"
                />

                {/* Active Buff Pills Overlay */}
                {(hud.starTimer > 0 || hud.feverTimer > 0 || hud.magnetTimer > 0) && (
                  <div className="absolute top-2 right-2 flex gap-1.5 pointer-events-none">
                    {hud.starTimer > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-400/90 text-black text-[10px] font-black">
                        ⭐ {Math.ceil(hud.starTimer)}s
                      </span>
                    )}
                    {hud.feverTimer > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-black">
                        2x 🪙 {Math.ceil(hud.feverTimer)}s
                      </span>
                    )}
                    {hud.magnetTimer > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/90 text-white text-[10px] font-black">
                        🧲 {Math.ceil(hud.magnetTimer)}s
                      </span>
                    )}
                  </div>
                )}

                {/* Pause Overlay */}
                {hud.paused && !hud.gameOver && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4">
                    <div className="text-lg font-black gold-text">بازی متوقف شد</div>
                    <div className="flex gap-2">
                      <GoldButton onClick={() => engineRef.current?.togglePause()} className="py-2 px-5 text-xs">
                        ادامه بازی
                      </GoldButton>
                      <button
                        onClick={() => {
                          engineRef.current?.stop();
                          setIsPlaying(false);
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/10 text-xs font-bold text-gray-200"
                      >
                        خروج به منو
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dual Responsive Multi-Touch Gamepad (LTR layout for natural left-move / right-action) */}
              <div className="glass-card p-3 touch-none" dir="ltr">
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Movement D-Pad */}
                  <div className="flex items-center gap-2">
                    <button
                      onPointerDown={(e) => { e.preventDefault(); engineRef.current?.setMove('left', true); }}
                      onPointerUp={() => engineRef.current?.setMove('left', false)}
                      onPointerLeave={() => engineRef.current?.setMove('left', false)}
                      onPointerCancel={() => engineRef.current?.setMove('left', false)}
                      className="w-14 h-14 rounded-2xl bg-[#181822] border border-amber-400/25 active:bg-amber-400/25 active:scale-95 flex items-center justify-center text-white text-xl font-black shadow-inner"
                    >
                      ◀
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); engineRef.current?.setMove('right', true); }}
                      onPointerUp={() => engineRef.current?.setMove('right', false)}
                      onPointerLeave={() => engineRef.current?.setMove('right', false)}
                      onPointerCancel={() => engineRef.current?.setMove('right', false)}
                      className="w-14 h-14 rounded-2xl bg-[#181822] border border-amber-400/25 active:bg-amber-400/25 active:scale-95 flex items-center justify-center text-white text-xl font-black shadow-inner"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Center: Ultimate Trigger */}
                  <button
                    disabled={hud.rage < 100}
                    onPointerDown={(e) => { e.preventDefault(); engineRef.current?.triggerUltimate(); }}
                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black transition-all ${
                      hud.rage >= 100
                        ? 'gold-gradient text-obsidian shadow-[0_0_20px_rgba(251,191,36,0.65)] animate-pulse active:scale-90'
                        : 'bg-white/5 border border-white/10 text-gray-500 opacity-50'
                    }`}
                  >
                    <Zap size={16} />
                    <span>ویژه</span>
                  </button>

                  {/* Right: Dash + Attack + Jump */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onPointerDown={(e) => { e.preventDefault(); engineRef.current?.triggerDash(); }}
                      className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center text-[9px] font-bold active:scale-90 ${
                        hud.dashReady
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}
                    >
                      <Wind size={15} />
                      <span>دش</span>
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); engineRef.current?.triggerAttack(); }}
                      className="w-14 h-14 rounded-2xl bg-red-500/25 border border-red-400/55 active:bg-red-500/45 active:scale-90 flex flex-col items-center justify-center text-red-100 text-[10px] font-black"
                    >
                      <Swords size={18} />
                      <span>حمله</span>
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); engineRef.current?.triggerJump(); }}
                      className="w-14 h-14 rounded-2xl gold-gradient text-obsidian active:scale-90 flex flex-col items-center justify-center text-[10px] font-black shadow-lg"
                    >
                      <span className="text-base leading-none">▲</span>
                      <span>پرش</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ IN-GAME SHOP TAB ═══════════════════ */}
      {subTab === 'shop' && shop && profile && (
        <div className="space-y-3">
          {/* Category Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'skins', label: 'اسکین‌ها' },
              { id: 'weapons', label: 'اسلحه‌ها' },
              { id: 'pets', label: 'همراهان' },
              { id: 'upgrades', label: 'ارتقاها' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setShopCat(c.id)}
                className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                  shopCat === c.id
                    ? 'bg-amber-400/20 border-amber-400/60 text-amber-200'
                    : 'bg-[#121218] border-white/10 text-gray-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Skins / Weapons / Pets Grid */}
          {shopCat !== 'upgrades' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {(shop[shopCat] || []).map((item) => {
                const itemType = shopCat === 'skins' ? 'skin' : shopCat === 'weapons' ? 'weapon' : 'pet';
                const ownedArr =
                  itemType === 'skin'
                    ? profile.owned_skins
                    : itemType === 'weapon'
                    ? profile.owned_weapons
                    : profile.owned_pets;
                const equippedId =
                  itemType === 'skin'
                    ? profile.equipped_skin
                    : itemType === 'weapon'
                    ? profile.equipped_weapon
                    : profile.equipped_pet;

                const isOwned = ownedArr?.includes(item.id);
                const isEquipped = equippedId === item.id;
                const canAfford = (profile.game_coins || 0) >= item.price;
                const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

                return (
                  <div
                    key={item.id}
                    className={`glass-card p-3 flex flex-col justify-between text-center relative ${
                      isEquipped ? 'border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.2)]' : rarity.border
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${rarity.badge}`}>
                          {item.rarity_fa || rarity.label}
                        </span>
                        {isEquipped && (
                          <span className="text-[9px] font-black text-emerald-300 flex items-center gap-0.5">
                            <Check size={11} /> فعال
                          </span>
                        )}
                      </div>

                      <ItemPreviewCanvas itemType={itemType} itemId={item.id} className="w-16 h-16 mb-2" />

                      <h4 className="text-xs font-extrabold text-white">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 leading-relaxed mt-1 mb-2.5 min-h-[2.4rem]">
                        {item.perk || item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      {isEquipped ? (
                        <div className="py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[11px] font-bold">
                          تجهیز شده ✓
                        </div>
                      ) : isOwned ? (
                        <button
                          disabled={busyId === `equip:${itemType}:${item.id}`}
                          onClick={() => handleEquip(itemType, item.id)}
                          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold active:scale-95 transition"
                        >
                          تجهیز کردن
                        </button>
                      ) : (
                        <GoldButton
                          fullWidth
                          disabled={!canAfford}
                          loading={busyId === `${itemType}:${item.id}`}
                          onClick={() => handleBuy(itemType, item.id)}
                          className="py-2 text-[11px] rounded-xl"
                        >
                          {canAfford ? `خرید · ${item.price.toLocaleString()} 🪙` : `${item.price.toLocaleString()} 🪙`}
                        </GoldButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Permanent Upgrades List */
            <div className="space-y-2.5">
              {(shop.upgrades || []).map((upg) => {
                const lvl = profile.upgrades?.[upg.id] || 0;
                const maxed = lvl >= upg.max_level;
                const nextCost = maxed ? 0 : upg.costs[lvl];
                const canAfford = (profile.game_coins || 0) >= nextCost;

                return (
                  <div key={upg.id} className="glass-card p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-400" />
                          <span>{upg.name}</span>
                          <span className="text-[10px] text-amber-300 font-mono">
                            Lv.{lvl}/{upg.max_level}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-gray-400 mt-1">{upg.description}</p>
                      </div>
                      {maxed ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[10px] font-black shrink-0">
                          حداکثر ✓
                        </span>
                      ) : (
                        <GoldButton
                          disabled={!canAfford}
                          loading={busyId === `upgrade:${upg.id}`}
                          onClick={() => handleBuy('upgrade', upg.id)}
                          className="py-1.5 px-3 text-[11px] rounded-xl shrink-0"
                        >
                          {nextCost.toLocaleString()} 🪙
                        </GoldButton>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: upg.max_level }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 flex-1 rounded-full ${
                            idx < lvl ? 'gold-gradient' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ LEADERBOARD TAB ═══════════════════ */}
      {subTab === 'leaderboard' && (
        <div className="space-y-3">
          {!leaderboard ? (
            <div className="py-12 text-center text-xs text-gray-400">در حال بارگذاری لیدربرد بازی...</div>
          ) : leaderboard.entries.length === 0 ? (
            <div className="glass-card p-6 text-center text-xs text-gray-400">
              هنوز هیچ رکوردی ثبت نشده! اولین قهرمان ادیسه پیکسلی باش 👑
            </div>
          ) : (
            <>
              {/* My Rank Card */}
              <div className="glass-card p-3.5 border-amber-400/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">جایگاه شما در این بازی</div>
                    <div className="text-[10px] text-gray-400">
                      رکورد: {(leaderboard.me?.high_score || 0).toLocaleString()} · مسافت: {(leaderboard.me?.best_distance || 0).toLocaleString()}m
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full gold-gradient text-obsidian text-xs font-black tabular-nums">
                  {leaderboard.me?.rank ? `#${leaderboard.me.rank}` : 'ثبت نشده'}
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-2">
                {leaderboard.entries.map((row) => {
                  const isMe = row.user_id === user.id;
                  const skinName = (SKIN_PALETTES[row.equipped_skin] || SKIN_PALETTES.royal_knight).name;
                  return (
                    <div
                      key={row.user_id}
                      className={`glass-card p-3 flex items-center justify-between ${
                        isMe ? 'border-amber-400/75 bg-[#161620]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black tabular-nums ${
                            row.rank === 1
                              ? 'gold-gradient text-obsidian'
                              : row.rank === 2
                              ? 'bg-[#C0C0C0] text-black'
                              : row.rank === 3
                              ? 'bg-[#CD7F32] text-white'
                              : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          {row.rank}
                        </span>
                        <Avatar name={row.first_name || row.username} size="sm" />
                        <div>
                          <div className="text-xs font-bold text-white max-w-[130px] truncate">
                            {row.first_name || row.username || `User ${row.user_id}`}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {skinName} · مرحله {row.max_stage} · {row.best_distance}m
                          </div>
                        </div>
                      </div>
                      <div className="text-left tabular-nums">
                        <div className="text-xs font-black gold-text">{row.high_score.toLocaleString()}</div>
                        <div className="text-[9px] text-gray-500">{row.total_kills} کشته</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ QUESTS, ACHIEVEMENTS & STATS TAB ═══════════════════ */}
      {subTab === 'quests' && profile && (
        <div className="space-y-3">
          {/* Daily Quests */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-extrabold gold-text flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-300" />
              <span>مأموریت‌های روزانه (جایزه سکه گیم)</span>
            </h3>
            <div className="space-y-2.5">
              {(profile.daily_quests || []).map((q) => {
                const pct = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
                return (
                  <div key={q.id} className="rounded-xl bg-[#16161F] border border-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{q.title}</div>
                        <div className="text-[10px] text-gray-400">{q.desc}</div>
                      </div>
                      {q.claimed ? (
                        <span className="text-[10px] font-bold text-emerald-400">دریافت شد ✓</span>
                      ) : q.completed ? (
                        <GoldButton
                          loading={busyId === `quest:${q.id}`}
                          onClick={() => handleClaimQuest(q.id)}
                          className="py-1.5 px-3 text-[10px] rounded-xl"
                        >
                          دریافت +{q.reward} 🪙
                        </GoldButton>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-300 tabular-nums">
                          +{q.reward} 🪙
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full gold-gradient" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {q.current.toLocaleString()}/{q.target.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="glass-card p-4 space-y-2.5">
            <h3 className="text-xs font-extrabold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award size={15} className="text-amber-400" />
                <span>دستاوردها</span>
              </span>
              <span className="text-[10px] text-amber-300 tabular-nums">
                {(profile.achievements || []).length} / {(stateData?.achievements_catalog || []).length}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(stateData?.achievements_catalog || []).map((a) => {
                const done = (profile.achievements || []).includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl p-2.5 border ${
                      done
                        ? 'bg-amber-400/10 border-amber-400/45'
                        : 'bg-black/30 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">{a.title}</span>
                      <span className="text-[9px] font-bold text-amber-300">+{a.reward}🪙</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 mt-1">{a.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Career Stats */}
          <div className="glass-card p-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[#16161F] p-2.5">
              <div className="text-sm font-black text-white tabular-nums">{(profile.games_played || 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">تعداد دست‌ها</div>
            </div>
            <div className="rounded-xl bg-[#16161F] p-2.5">
              <div className="text-sm font-black text-red-400 tabular-nums">{(profile.total_kills || 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">کل دشمنان نابودشده</div>
            </div>
            <div className="rounded-xl bg-[#16161F] p-2.5">
              <div className="text-sm font-black text-purple-400 tabular-nums">{(profile.bosses_defeated || 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">باس‌های شکست‌خورده</div>
            </div>
            <div className="rounded-xl bg-[#16161F] p-2.5">
              <div className="text-sm font-black gold-text tabular-nums">{(profile.total_coins_earned || 0).toLocaleString()} 🪙</div>
              <div className="text-[10px] text-gray-400">کل سکه‌های کسب‌شده</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ GAME OVER MODAL ═══════════════════ */}
      <AnimatePresence>
        {gameOverResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-5 max-w-sm w-full border-amber-400/50 bg-[#111117] space-y-4 text-center shadow-2xl"
            >
              <div>
                {gameOverResult.server?.is_new_record ? (
                  <div className="inline-block px-3 py-0.5 rounded-full gold-gradient text-obsidian text-[10px] font-black mb-1">
                    🏆 رکورد جدید ثبت شد!
                  </div>
                ) : null}
                <h3 className="text-lg font-black text-white">پایان ماجراجویی</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {savingRun ? 'در حال ذخیره در دیتابیس رویال...' : 'نتیجه با موفقیت در دیتابیس ثبت شد ✨'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 tabular-nums">
                <div className="rounded-xl bg-[#181822] p-2.5 border border-white/5">
                  <div className="text-base font-black gold-text">{gameOverResult.summary.score.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400">امتیاز نهایی</div>
                </div>
                <div className="rounded-xl bg-[#181822] p-2.5 border border-white/5">
                  <div className="text-base font-black text-amber-300">
                    +{(gameOverResult.server?.run?.coins_earned ?? gameOverResult.summary.coins_earned).toLocaleString()} 🪙
                  </div>
                  <div className="text-[10px] text-gray-400">سکه گیم</div>
                </div>
                <div className="rounded-xl bg-[#181822] p-2.5 border border-white/5">
                  <div className="text-sm font-bold text-white">
                    مرحله {gameOverResult.summary.stage_reached} · {gameOverResult.summary.distance}m
                  </div>
                  <div className="text-[10px] text-gray-400">مسافت و قلمرو</div>
                </div>
                <div className="rounded-xl bg-[#181822] p-2.5 border border-white/5">
                  <div className="text-sm font-bold text-emerald-400">
                    +{gameOverResult.server?.run?.royal_xp_earned ?? 0} XP
                  </div>
                  <div className="text-[10px] text-gray-400">پاداش پروفایل رویال</div>
                </div>
              </div>

              {gameOverResult.server?.newly_unlocked_achievements?.length > 0 && (
                <div className="rounded-xl bg-amber-400/10 border border-amber-400/40 p-2.5 text-xs space-y-1">
                  <div className="font-bold text-amber-300">🎉 دستاورد جدید باز شد!</div>
                  {gameOverResult.server.newly_unlocked_achievements.map((a) => (
                    <div key={a.id} className="text-[11px] text-gray-200">
                      {a.title} (+{a.reward} 🪙)
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <GoldButton fullWidth onClick={startNewRun}>
                  <RotateCcw size={15} />
                  <span>بازی مجدد</span>
                </GoldButton>
                <button
                  onClick={() => {
                    setGameOverResult(null);
                    setIsPlaying(false);
                    setSubTab('shop');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 text-xs font-bold text-amber-200 border border-amber-400/30"
                >
                  فروشگاه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
