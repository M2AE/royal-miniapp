import React from 'react';
import { motion } from 'framer-motion';

export default function GoldProgress({
  current = 0,
  max = 100,
  height = 'h-3',
  showLabel = true,
  label = '',
  className = '',
}) {
  const ratio = max <= 0 ? 1 : Math.min(1, Math.max(0, current / max));
  const percent = Math.round(ratio * 100);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-gray-400 font-medium tabular-nums">
          <span>{label || 'پیشرفت'}</span>
          <span className="gold-text font-bold">{percent}%</span>
        </div>
      )}
      <div
        className={`w-full ${height} rounded-full overflow-hidden relative`}
        style={{
          backgroundColor: '#181820',
          border: '1px solid rgba(212, 175, 55, 0.15)',
        }}
      >
        <motion.div
          className="h-full rounded-full gold-gradient relative"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Subtle shine effect overlay */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
