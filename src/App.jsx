import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import TabBar, { adminTab, baseTabs } from './components/TabBar';
import Profile from './pages/Profile';
import MiniGames from './pages/MiniGames';
import Levels from './pages/Levels';
import Leaderboard from './pages/Leaderboard';
import Shop from './pages/Shop';
import Subscriptions from './pages/Subscriptions';
import AIPrompts from './pages/AIPrompts';
import Admin from './pages/Admin';
import { api } from './api';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [checkingTelegram, setCheckingTelegram] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#09090B');
      WebApp.setBackgroundColor('#09090B');
    } catch (_) {
      /* running outside Telegram */
    }

    const tgUser = WebApp?.initDataUnsafe?.user;
    if (tgUser && WebApp?.initData) {
      setUser({
        id: tgUser.id,
        first_name: tgUser.first_name || '',
        last_name: tgUser.last_name || '',
        username: tgUser.username || '',
        photo_url: tgUser.photo_url || '',
      });
    }
    setCheckingTelegram(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`${API_BASE}/api/v1/admin/stars-report`)
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [user?.id]);

  const handleTabChange = useCallback((index) => {
    setActiveTab(index);
    setHideTabBar(false);
    try {
      WebApp.HapticFeedback.impactOccurred('light');
    } catch (_) {
      /* no haptics outside Telegram */
    }
  }, []);

  if (checkingTelegram) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-obsidian">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-obsidian text-white font-vazir px-5 py-16 flex items-center justify-center" dir="rtl">
        <section className="glass-card max-w-lg w-full p-7 text-center space-y-4">
          <div className="text-5xl">👑</div>
          <h1 className="text-2xl font-black gold-text">رویال</h1>
          <p className="text-sm text-gray-300 leading-7">
            مجموعه‌ای از امکانات هوشمند، مینی‌گیم‌های پیکسلی، پروفایل و خدمات ویژه.
          </p>
          <p className="text-xs text-gray-500 leading-6">
            برای مشاهده پروفایل، بازی‌ها و خریدهای متصل به حساب، این برنامه را از دکمه رسمی ربات در تلگرام باز کن.
          </p>
        </section>
      </main>
    );
  }

  const pages = [
    <Profile key="profile" user={user} apiBase={API_BASE} />,
    <MiniGames key="minigames" user={user} apiBase={API_BASE} onPlayingChange={setHideTabBar} />,
    <Levels key="levels" user={user} apiBase={API_BASE} />,
    <Leaderboard key="leaderboard" user={user} apiBase={API_BASE} />,
    <Shop key="shop" user={user} apiBase={API_BASE} />,
    <Subscriptions key="subscriptions" user={user} apiBase={API_BASE} />,
    <AIPrompts key="ai-prompts" user={user} apiBase={API_BASE} />,
    ...(isAdmin ? [<Admin key="admin" apiBase={API_BASE} />] : []),
  ];

  return (
    <div className={`min-h-screen bg-obsidian font-vazir ${hideTabBar ? 'pb-4' : 'pb-24'}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {pages[activeTab]}
        </motion.div>
      </AnimatePresence>
      {!hideTabBar && (
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={isAdmin ? [...baseTabs, adminTab] : baseTabs}
        />
      )}
    </div>
  );
}
