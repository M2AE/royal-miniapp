import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Award, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import Avatar from '../components/Avatar';
import GoldButton from '../components/GoldButton';
import GoldProgress from '../components/GoldProgress';

export default function Profile({ user, apiBase = '' }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimToast, setClaimToast] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${apiBase}/api/v1/profile/${user.id}`);
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const handleClaimDaily = async () => {
    if (!profile?.can_claim_daily || claiming) return;
    try {
      setClaiming(true);
      const res = await api.post(`${apiBase}/api/v1/profile/${user.id}/daily`);
      if (res.data?.success) {
        setClaimToast(res.data.message);
        fetchProfile();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'خطا در دریافت پاداش';
      setClaimToast(msg);
    } finally {
      setClaiming(false);
      setTimeout(() => setClaimToast(null), 4000);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin border-amber-400" />
        <span className="text-xs text-gray-500 font-medium">در حال بارگذاری شناسنامه سلطنتی...</span>
      </div>
    );
  }

  const p = profile || {};

  if (!loading && !profile) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 text-center text-sm text-gray-300">
        دریافت اطلاعات پروفایل ناموفق بود. مینی‌اپ را از داخل تلگرام دوباره باز کنید.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
      {/* Toast Notification */}
      {claimToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-card px-4 py-3 flex items-center gap-2 border border-amber-500/40 text-xs shadow-lg"
        >
          <Sparkles size={16} className="text-amber-300 shrink-0" />
          <span className="text-gray-200">{claimToast}</span>
        </motion.div>
      )}

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* User Avatar with Gold Ring */}
        <Avatar
          photoUrl={user?.photo_url}
          name={p.first_name || user?.first_name}
          size="lg"
          className="mb-3"
        />

        {/* User Name & Handle */}
        <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
          <span>{p.first_name || user?.first_name}</span>
          <CheckCircle2 size={16} className="text-amber-400 fill-amber-400/20" />
        </h2>
        {user?.username && (
          <span className="text-xs text-gray-500 font-mono dir-ltr mb-3">
            @{user.username}
          </span>
        )}

        {/* Level Badge (Strict: NO Nicknames/Titles) */}
        <div className="px-3.5 py-1 rounded-full gold-gradient text-obsidian text-xs font-black tracking-wide uppercase shadow-md mb-4">
          Level {p.level || 1}
        </div>

        {/* Balance Display */}
        <div className="flex flex-col items-center mb-5">
          <span className="text-[11px] text-gray-400 font-medium mb-0.5">موجودی خزانه سلطنتی</span>
          <div className="flex items-center gap-1.5 tabular-nums">
            <span className="text-3xl font-black gold-text">
              {(p.coins || 0).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-amber-200">🪙 رویال</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full">
          <GoldProgress
            current={p.xp_in_level || 0}
            max={p.level_range || 100}
            label={`پیشرفت به Level ${(p.level || 1) + 1} (${(p.xp || 0).toLocaleString()} XP)`}
          />
        </div>
      </motion.div>

      {/* 3-Column Symmetrical Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="grid grid-cols-3 gap-2.5"
      >
        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <MessageSquare size={18} className="text-amber-400/80 mb-1.5" />
          <span className="text-base font-extrabold text-white tabular-nums">
            {(p.messages_count || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">پیام‌ها</span>
        </div>

        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <Award size={18} className="text-amber-400/80 mb-1.5" />
          <span className="text-base font-extrabold text-white tabular-nums">
            {(p.dooz_wins || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">بردهای دوز</span>
        </div>

        <div className="glass-card p-3.5 flex flex-col items-center text-center">
          <Trophy size={18} className="text-amber-400/80 mb-1.5" />
          <span className="text-base font-extrabold text-white tabular-nums">
            #{(p.rank || 1).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">رتبه کل</span>
        </div>
      </motion.div>

      {/* Daily Claim Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <GoldButton
          fullWidth
          onClick={handleClaimDaily}
          loading={claiming}
          disabled={!p.can_claim_daily}
          className="shadow-[0_4px_25px_rgba(212,175,55,0.25)]"
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles size={18} />
            <span>{p.can_claim_daily ? '✦ دریافت پاداش روزانه (+۵۰ سکه رویال)' : '⏳ پاداش روزانه امروز دریافت شده است'}</span>
          </span>
        </GoldButton>
      </motion.div>
    </div>
  );
}
