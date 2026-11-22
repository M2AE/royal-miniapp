import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal } from 'lucide-react';
import { api } from '../api';
import Avatar from '../components/Avatar';

export default function Leaderboard({ user, apiBase = '' }) {
  const [users, setUsers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const [boardRes, rankRes] = await Promise.all([
          api.get(`${apiBase}/api/v1/leaderboard?limit=50`),
          api.get(`${apiBase}/api/v1/leaderboard/rank/${user.id}`).catch(() => null),
        ]);
        setUsers(boardRes.data?.users || []);
        if (rankRes?.data) {
          setUserRank(rankRes.data);
        }
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user?.id]);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  // Rearrange top 3 for podium: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2, place: 'second' });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1, place: 'first' });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3, place: 'third' });

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin border-amber-400" />
        <span className="text-xs text-gray-500 font-medium">در حال بارگذاری تالار مشاهیر...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-5 pb-16">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
          <Trophy size={20} className="text-amber-400" />
          <span>تالار مشاهیر رویال</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">برترین‌های امپراتوری بر اساس تجربه و مهارت</p>
      </div>

      {/* Podium (Top 3) */}
      {podiumOrder.length > 0 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
          {podiumOrder.map((item) => {
            const isFirst = item.place === 'first';
            const isSecond = item.place === 'second';
            const height = isFirst ? 'h-40' : isSecond ? 'h-32' : 'h-28';
            const ringColor = isFirst ? 'gold-gradient' : isSecond ? 'silver-gradient' : 'bronze-gradient';
            const badgeBg = isFirst ? 'gold-gradient text-obsidian' : isSecond ? 'bg-[#C0C0C0] text-black' : 'bg-[#CD7F32] text-white';

            return (
              <motion.div
                key={item.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center"
              >
                {/* Crown for first place */}
                {isFirst && (
                  <Crown size={22} className="text-amber-300 fill-amber-300 animate-bounce mb-1" />
                )}

                <Avatar
                  name={item.first_name || item.username}
                  size={isFirst ? 'md' : 'sm'}
                  className="mb-1.5"
                />

                <span className="text-xs font-bold text-white max-w-[80px] truncate">
                  {item.first_name || item.username || `User ${item.user_id}`}
                </span>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  Level {item.level}
                </span>

                {/* Pedestal Box */}
                <div
                  className={`w-full ${height} mt-2 rounded-t-2xl flex flex-col items-center justify-center border-t border-x border-amber-500/20 bg-[#121217] relative`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-md mb-1 ${badgeBg}`}
                  >
                    {item.rank}
                  </div>
                  <span className="text-[11px] font-black tabular-nums text-gray-200">
                    {item.xp.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-500">XP</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ranks 4+ List */}
      <div className="space-y-2">
        {rest.map((item, idx) => (
          <motion.div
            key={item.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
            className={`glass-card p-3 flex items-center justify-between ${
              item.user_id === user.id ? 'border-amber-400/70 bg-[#16161D]' : ''
            }`}
          >
            {/* Rank & Avatar & Info */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-500 w-6 text-center tabular-nums">
                #{item.rank}
              </span>
              <Avatar
                name={item.first_name || item.username}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {item.first_name || item.username || `User ${item.user_id}`}
                </span>
                <span className="text-[10px] text-amber-300/70">
                  Level {item.level}
                </span>
              </div>
            </div>

            {/* XP */}
            <div className="text-left">
              <span className="text-xs font-extrabold gold-text tabular-nums">
                {item.xp.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 ml-1">XP</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fixed Sticky User Rank Bar */}
      {userRank && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4">
          <div className="max-w-md mx-auto glass-card p-3 flex items-center justify-between shadow-2xl border-amber-400/50 bg-[#141419]/95 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Medal size={18} className="text-amber-400" />
              <span className="text-xs font-bold text-white">رتبه شما:</span>
              <span className="px-2 py-0.5 rounded-full gold-gradient text-obsidian text-xs font-black tabular-nums">
                #{userRank.rank}
              </span>
            </div>
            <div className="text-xs font-semibold text-gray-400 tabular-nums">
              از میان <span className="text-white font-bold">{userRank.total_users.toLocaleString()}</span> کاربر
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
