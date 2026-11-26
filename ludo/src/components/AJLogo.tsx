import React, { useState } from 'react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import { COLOR_META, PlayerColor } from '../shared/ludoEngine';

interface ABLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStudio?: boolean;
  className?: string;
}

export const ABLogo: React.FC<ABLogoProps> = ({ size = 'md', showStudio = true, className = '' }) => {
  const dim =
    size === 'xl' ? 88 : size === 'lg' ? 60 : size === 'md' ? 40 : 32;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AB Studios Emblem"
        className="shrink-0 drop-shadow-[0_6px_18px_rgba(245,158,11,0.35)]"
      >
        <defs>
          <linearGradient id="abCrestGrad" x1="10" y1="8" x2="90" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>
          <linearGradient id="abGoldGrad" x1="18" y1="14" x2="82" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="48%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="abCrimsonGrad" x1="20" y1="24" x2="54" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>

        {/* Octagonal Shield Frame */}
        <polygon
          points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30"
          fill="url(#abCrestGrad)"
          stroke="url(#abGoldGrad)"
          strokeWidth="4"
        />
        {/* Inner Chamfer Line */}
        <polygon
          points="33,13 67,13 87,33 87,67 67,87 33,87 13,67 13,33"
          fill="none"
          stroke="rgba(253, 230, 138, 0.25)"
          strokeWidth="1.5"
        />
        {/* Crown Apex Diamond */}
        <polygon points="50,16 55,22 50,27 45,22" fill="url(#abGoldGrad)" />

        {/* Stylized Interlocked 'A' */}
        <path
          d="M20 73 L36 30 L45 30 L52 54 L44 54 L40 40 L30 73 Z"
          fill="url(#abCrimsonGrad)"
        />
        <path d="M27 58 L47 58 L45 64 L25 64 Z" fill="#F8FAFC" />

        {/* Stylized Interlocked 'B' */}
        <path
          d="M53 30 H69 C76.5 30 81 34 81 40.5 C81 45 78.2 48.2 74 49.5 C79.2 50.8 82.5 54.6 82.5 60.5 C82.5 68 77.2 73 69 73 H53 V30 Z M61.5 37 V46.8 H68.2 C71.6 46.8 73.5 45.1 73.5 41.9 C73.5 38.7 71.6 37 68.2 37 H61.5 Z M61.5 53.5 V66 H68.8 C72.6 66 74.6 63.9 74.6 59.8 C74.6 55.6 72.6 53.5 68.8 53.5 H61.5 Z"
          fill="url(#abGoldGrad)"
        />
      </svg>

      {showStudio && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-extrabold tracking-tight text-white whitespace-nowrap text-lg sm:text-xl">
            {OFFICIAL_BRANDING.gameName}
          </span>
          <span className="text-[11px] font-medium tracking-wider text-amber-400/95 whitespace-nowrap mt-0.5">
            {OFFICIAL_BRANDING.studioName}
          </span>
        </div>
      )}
    </div>
  );
};

export const AJLogo = ABLogo;

interface PlayerAvatarProps {
  color: PlayerColor;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ color, name, size = 'md', active = false }) => {
  const [imgError, setImgError] = useState(false);
  const meta = COLOR_META[color];
  const dimClass =
    size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-11 h-11' : 'w-9 h-9';

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden transition-transform duration-200 ${dimClass} ${
        active ? 'scale-105' : ''
      }`}
      style={{
        border: `2px solid ${active ? meta.hex : 'rgba(255,255,255,0.14)'}`,
        boxShadow: active ? `0 0 14px ${meta.hex}66, 0 0 0 3px ${meta.hex}33` : undefined,
        backgroundColor: meta.darkHex,
      }}
    >
      {!imgError ? (
        <img
          src={meta.avatarPath}
          alt={`${name} (${meta.label})`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-display font-bold text-white text-sm"
          style={{ background: `linear-gradient(135deg, ${meta.hex}, ${meta.darkHex})` }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};
