import React from 'react';
import { motion } from 'framer-motion';

export default function GoldButton({
  children,
  onClick,
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-2xl px-6 py-3
        font-bold text-sm text-obsidian
        transition-all duration-200
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        background: disabled
          ? '#333'
          : 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
        color: disabled ? '#666' : '#09090B',
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>لطفاً صبر کنید...</span>
          </span>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}
