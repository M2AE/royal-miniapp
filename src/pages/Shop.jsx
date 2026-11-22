import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles, Check, AlertCircle, X } from 'lucide-react';
import { api } from '../api';
import GoldButton from '../components/GoldButton';

export default function Shop({ user, apiBase = '' }) {
  const [items, setItems] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, profileRes] = await Promise.all([
        api.get(`${apiBase}/api/v1/shop/items`),
        api.get(`${apiBase}/api/v1/profile/${user.id}`).catch(() => null),
      ]);
      setItems(itemsRes.data?.items || []);
      if (profileRes?.data) {
        setBalance(profileRes.data.coins || 0);
      }
    } catch (err) {
      console.error('Failed to load shop', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleBuy = async (item) => {
    try {
      setBuyingId(item.id);
      const res = await api.post(`${apiBase}/api/v1/shop/buy`, {
        user_id: user.id,
        item_id: item.id,
      });

      if (res.data?.success) {
        setBalance(res.data.remaining_coins);
        setToast({ type: 'success', text: res.data.message });
        setSelectedItem(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'خطا در انجام تراکنش';
      setToast({ type: 'error', text: msg });
    } finally {
      setBuyingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin border-amber-400" />
        <span className="text-xs text-gray-500 font-medium">در حال بارگذاری ویترین سلطنتی...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`glass-card px-4 py-3 flex items-center gap-2 text-xs shadow-lg ${
            toast.type === 'success' ? 'border-amber-400/60' : 'border-red-500/60'
          }`}
        >
          {toast.type === 'success' ? (
            <Sparkles size={16} className="text-amber-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-400 shrink-0" />
          )}
          <span className="text-gray-200">{toast.text}</span>
        </motion.div>
      )}

      {/* Header Banner */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>فروشگاه رویال</span>
              <ShoppingBag size={16} className="text-amber-400" />
            </h2>
            <p className="text-xs text-gray-400 mt-1">خرید بوسترها و قابلیت‌های اختصاصی ربات</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400">موجودی سکه</span>
            <span className="text-base font-extrabold gold-text tabular-nums">
              {balance.toLocaleString()} 🪙
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const canAfford = balance >= item.price;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              className="glass-card p-4 flex flex-col justify-between text-center relative hover:border-amber-400/40 transition-colors"
            >
              <div>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#181822] border border-amber-400/20 flex items-center justify-center text-2xl mb-2.5">
                  {item.icon || '💎'}
                </div>
                <h3 className="text-xs font-bold text-white mb-1">{item.name}</h3>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed mb-3">
                  {item.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-center gap-1 text-xs font-black tabular-nums text-amber-300">
                  <span>{item.price.toLocaleString()}</span>
                  <span className="text-[10px]">🪙 رویال</span>
                </div>

                <GoldButton
                  fullWidth
                  disabled={!canAfford}
                  loading={buyingId === item.id}
                  onClick={() => setSelectedItem(item)}
                  className="py-2 text-xs rounded-xl"
                >
                  {canAfford ? 'خرید' : 'سکه ناکافی'}
                </GoldButton>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-5 max-w-sm w-full bg-[#111116] border border-amber-400/40 relative shadow-2xl"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 left-4 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl gold-gradient flex items-center justify-center text-3xl shadow-lg">
                  {selectedItem.icon || '💎'}
                </div>
                <h3 className="text-sm font-bold text-white">{selectedItem.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {selectedItem.description}
                </p>

                <div className="p-3 rounded-xl bg-[#181822] border border-amber-400/20 text-xs">
                  <span className="text-gray-400">مبلغ قابل کسر: </span>
                  <span className="font-bold gold-text tabular-nums">
                    {selectedItem.price.toLocaleString()} سکه رویال 🪙
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <GoldButton
                    fullWidth
                    loading={buyingId === selectedItem.id}
                    onClick={() => handleBuy(selectedItem)}
                  >
                    تأیید و پرداخت
                  </GoldButton>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-400 hover:text-white"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
