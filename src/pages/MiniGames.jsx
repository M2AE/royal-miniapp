import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Gamepad2, Play, Sparkles, Trophy, Users } from 'lucide-react';
import { api } from '../api';
import GoldButton from '../components/GoldButton';
import { MINIGAMES_REGISTRY } from '../games/registry';

function LiveGameBanner({ startBanner }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || typeof startBanner !== 'function') return undefined;
    return startBanner(ref.current);
  }, [startBanner]);

  return (
    <canvas
      ref={ref}
      className="pixel-canvas w-full h-36 block object-cover"
    />
  );
}

export default function MiniGames({ user, apiBase = '', onPlayingChange }) {
  const [catalogMap, setCatalogMap] = useState({});
  const [activeGameId, setActiveGameId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`${apiBase}/api/v1/minigames/catalog`);
      const map = {};
      for (const item of res.data?.games || []) {
        map[item.id] = item;
      }
      setCatalogMap(map);
    } catch (err) {
      console.error('Failed to load minigames catalog', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (user?.id) loadCatalog();
  }, [user?.id, loadCatalog]);

  const openGame = (gameId) => {
    setActiveGameId(gameId);
    onPlayingChange?.(true);
  };

  const closeGame = () => {
    setActiveGameId(null);
    onPlayingChange?.(false);
    loadCatalog();
  };

  useEffect(() => () => { onPlayingChange?.(false); }, [onPlayingChange]);

  const activeEntry = MINIGAMES_REGISTRY.find((g) => g.id === activeGameId);
  if (activeEntry) {
    const GameComp = activeEntry.Component;
    return <GameComp user={user} apiBase={apiBase} onExit={closeGame} />;
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-4" dir="rtl">
      {/* Arcade Header */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Gamepad2 size={18} className="text-amber-400" />
              <span>تالار مینی‌گیم‌های رویال</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              بازی کن، سکه و اسکین بخر و در لیدربرد جهانی بدرخش
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl gold-gradient flex items-center justify-center text-obsidian shadow-md shrink-0">
            <Crown size={22} />
          </div>
        </div>
      </div>

      {/* Extensible Vertical Stack of Rounded-Rectangle Game Cards */}
      <div className="space-y-4">
        {MINIGAMES_REGISTRY.map((game, idx) => {
          const remote = catalogMap[game.id];
          const stats = remote?.user_stats || {};
          const totalPlayers = remote?.total_players || 0;

          return (
            <motion.article
              key={game.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className="rounded-3xl overflow-hidden bg-[#111115] border border-amber-400/25 shadow-[0_10px_35px_rgba(0,0,0,0.45)] hover:border-amber-400/50 transition-all"
            >
              {/* Animated Pixel Art Hero Rectangle */}
              <div className="relative bg-black border-b border-amber-400/20">
                <LiveGameBanner startBanner={game.startBanner} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-transparent to-black/25 pointer-events-none" />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full gold-gradient text-obsidian text-[10px] font-black shadow">
                    {game.badge}
                  </span>
                  {totalPlayers > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm border border-white/10 text-[10px] text-gray-200 flex items-center gap-1 tabular-nums">
                      <Users size={11} className="text-amber-300" />
                      {totalPlayers.toLocaleString()} بازیکن
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2.5 right-4 left-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-base font-black text-white drop-shadow">{game.title}</h3>
                    <span className="text-[10px] text-amber-300/90 font-mono">{game.subtitle}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3.5">
                <p className="text-xs text-gray-300 leading-6">
                  {game.description}
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#181822] border border-amber-400/15 text-amber-200/90 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Persistent DB User Stats Strip */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="rounded-2xl bg-[#16161E] border border-white/5 py-2 px-1">
                    <div className="text-xs font-black gold-text tabular-nums">
                      {loading && !remote ? '…' : (stats.high_score || 0).toLocaleString()}
                    </div>
                    <div className="text-[9.5px] text-gray-400 mt-0.5">رکورد شما</div>
                  </div>
                  <div className="rounded-2xl bg-[#16161E] border border-white/5 py-2 px-1">
                    <div className="text-xs font-black text-amber-300 tabular-nums">
                      {loading && !remote ? '…' : `${(stats.game_coins || 0).toLocaleString()} 🪙`}
                    </div>
                    <div className="text-[9.5px] text-gray-400 mt-0.5">سکه گیم</div>
                  </div>
                  <div className="rounded-2xl bg-[#16161E] border border-white/5 py-2 px-1">
                    <div className="text-xs font-black text-sky-300 tabular-nums flex items-center justify-center gap-1">
                      <Trophy size={11} className="text-amber-400" />
                      <span>{stats.rank ? `#${stats.rank}` : '—'}</span>
                    </div>
                    <div className="text-[9.5px] text-gray-400 mt-0.5">رتبه لیدربرد</div>
                  </div>
                </div>

                <GoldButton fullWidth onClick={() => openGame(game.id)} className="py-3 rounded-2xl">
                  <Play size={16} className="fill-obsidian" />
                  <span>ورود و شروع بازی</span>
                </GoldButton>
              </div>
            </motion.article>
          );
        })}

        {/* Extensible Future Games Placeholder Slot */}
        <div className="rounded-3xl border border-dashed border-amber-400/20 bg-[#111115]/50 p-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/5 flex items-center justify-center text-amber-400/60">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-bold text-gray-300 text-xs">مینی‌گیم‌های بعدی به‌زودی...</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                این بخش آماده افزودن بازی‌های جدید رویال است
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-gray-400">به‌زودی</span>
        </div>
      </div>
    </div>
  );
}
