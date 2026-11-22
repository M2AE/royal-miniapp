import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { api } from '../api';

export default function Levels({ user, apiBase = '' }) {
  const [levels, setLevels] = useState([]);
  const [userLevelInfo, setUserLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [lvlRes, userRes] = await Promise.all([
          api.get(`${apiBase}/api/v1/levels`),
          api.get(`${apiBase}/api/v1/levels/user/${user.id}`).catch(() => null),
        ]);
        setLevels(lvlRes.data?.levels || []);
        if (userRes?.data) {
          setUserLevelInfo(userRes.data);
        }
      } catch (err) {
        console.error('Failed to load levels', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const currentLevel = userLevelInfo?.level || 1;

  if (loading && levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin border-amber-400" />
        <span className="text-xs text-gray-500 font-medium">در حال دریافت نقشه سطوح...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
      {/* Header Banner */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>سطوح و دسترسی‌های سلطنتی</span>
              <Sparkles size={16} className="text-amber-400" />
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              سطح کنونی شما: <span className="gold-text font-black">Level {currentLevel}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center text-obsidian font-black text-lg shadow-md">
            L{currentLevel}
          </div>
        </div>
      </div>

      {/* Levels Step List */}
      <div className="space-y-2">
        {levels.map((item, idx) => {
          const isUnlocked = item.level <= currentLevel;
          const isCurrent = item.level === currentLevel;

          return (
            <motion.div
              key={item.level}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.4), duration: 0.2 }}
              className={`p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 ${
                isCurrent
                  ? 'bg-[#15151C] border-2 border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : isUnlocked
                  ? 'glass-card border-amber-500/20'
                  : 'bg-[#0E0E12] border border-white/5 opacity-60'
              }`}
            >
              {/* Left: Level Number & Check/Lock */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                    isCurrent
                      ? 'gold-gradient text-obsidian shadow-sm'
                      : isUnlocked
                      ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                      : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}
                >
                  {isUnlocked ? (
                    <Check size={16} strokeWidth={3} className={isCurrent ? 'text-obsidian' : 'text-amber-400'} />
                  ) : (
                    <Lock size={14} className="text-gray-500" />
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isUnlocked ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      Level {item.level}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        سطح فعال
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    {item.unlocks?.join(' • ') || 'دسترسی عمومی'}
                  </span>
                </div>
              </div>

              {/* Right: XP Required */}
              <div className="text-left shrink-0">
                <span className="text-xs font-semibold tabular-nums text-gray-400">
                  {item.xp_required.toLocaleString()} <span className="text-[10px] text-gray-500">XP</span>
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
