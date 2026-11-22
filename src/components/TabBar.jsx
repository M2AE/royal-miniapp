import React from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Crown, ShoppingBag, Gem, SlidersHorizontal, ShieldCheck, Gamepad2 } from 'lucide-react';

export const baseTabs = [
  { label: 'پروفایل', icon: User },
  { label: 'بازی‌ها', icon: Gamepad2 },
  { label: 'سطوح', icon: Trophy },
  { label: 'لیدربرد', icon: Crown },
  { label: 'فروشگاه', icon: ShoppingBag },
  { label: 'اشتراک', icon: Gem },
  { label: 'هوش مصنوعی', icon: SlidersHorizontal },
];
export const adminTab = { label: 'مدیریت', icon: ShieldCheck };

export default function TabBar({ activeTab, onTabChange, tabs = baseTabs }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="mx-auto max-w-lg"
        style={{
          background: 'rgba(17, 17, 21, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        }}
      >
        <nav className="flex items-center justify-around px-1 py-2 safe-area-pb">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;

            return (
              <button
                key={tab.label}
                onClick={() => onTabChange(index)}
                className="relative flex flex-col items-center justify-center flex-1 py-1.5 gap-1 transition-all duration-200 outline-none min-w-0"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-2 left-0 right-0 mx-auto w-7 h-1 rounded-full gold-gradient"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`transition-all duration-200 ${
                    isActive ? 'text-gold-400' : 'text-gray-500'
                  }`}
                />
                <span
                  className={`text-[9.5px] font-medium truncate max-w-full transition-all duration-200 ${
                    isActive ? 'gold-text font-semibold' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
