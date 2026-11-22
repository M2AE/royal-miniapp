import React from 'react';

export default function Avatar({
  photoUrl = '',
  name = '',
  size = 'md',
  className = '',
}) {
  const sizeMap = {
    sm: 'w-10 h-10 text-xs p-0.5',
    md: 'w-16 h-16 text-lg p-[2px]',
    lg: 'w-24 h-24 text-2xl p-[3px]',
    xl: 'w-28 h-28 text-3xl p-[3px]',
  };

  const ringClass = sizeMap[size] || sizeMap.md;
  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative rounded-full gold-gradient shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center justify-center shrink-0 ${ringClass} ${className}`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#111115] flex items-center justify-center border border-[#09090B]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="font-extrabold gold-text">{initial}</span>
        )}
      </div>
    </div>
  );
}
