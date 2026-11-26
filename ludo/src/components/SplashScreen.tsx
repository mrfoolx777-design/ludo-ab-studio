import React, { useEffect, useState } from 'react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import { ABLogo } from './AJLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const start = performance.now();
    const duration = 950;
    let raf = 0;

    const step = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      setProgress(Math.round(12 + ratio * 88));
      if (ratio < 1) {
        raf = requestAnimationFrame(step);
      } else {
        onComplete();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#080B12] flex flex-col items-center justify-between px-6 py-10 select-none">
      <div className="text-xs font-medium tracking-[0.22em] text-slate-400">
        {OFFICIAL_BRANDING.studioName.toUpperCase()}
      </div>

      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <ABLogo size="xl" showStudio={false} className="mb-6" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          {OFFICIAL_BRANDING.gameName}
        </h1>
        <p className="mt-2 text-sm font-semibold tracking-[0.26em] text-amber-400">
          {OFFICIAL_BRANDING.tagline}
        </p>

        <div className="w-full max-w-[240px] mt-8">
          <div className="h-1.5 w-full rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-rose-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono-nums">
            <span>Preparing Arena</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-slate-500 text-center">
          Developed by <span className="text-slate-300 font-medium">{OFFICIAL_BRANDING.developerName}</span>
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-4 px-4 py-2 min-h-[44px]"
        >
          Enter Game
        </button>
      </div>
    </div>
  );
};
