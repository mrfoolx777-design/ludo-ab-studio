import React, { useEffect, useState } from 'react';
import { Cpu, User, X } from 'lucide-react';
import {
  AIDifficulty,
  COLOR_META,
  COLOR_ORDER,
  PlayerColor,
  PlayerSeatConfig,
  SeatType,
  getColorsForPlayerCount,
} from '../shared/ludoEngine';
import { soundEngine } from '../utils/audio';
import { PlayerAvatar } from './AJLogo';

interface OfflineSetupModalProps {
  open: boolean;
  initialMode: 'offline_ai' | 'pass_and_play';
  initialColor?: PlayerColor;
  initialPlayerName?: string;
  onStartMatch: (mode: 'offline_ai' | 'pass_and_play', seats: PlayerSeatConfig[]) => void;
  onClose: () => void;
}

export const OfflineSetupModal: React.FC<OfflineSetupModalProps> = ({
  open,
  initialMode,
  initialColor = 'red',
  initialPlayerName = 'Player',
  onStartMatch,
  onClose,
}) => {
  const [mode, setMode] = useState<'offline_ai' | 'pass_and_play'>(initialMode);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [chosenColor, setChosenColor] = useState<PlayerColor>(initialColor);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [names, setNames] = useState<Record<PlayerColor, string>>({
    red: initialPlayerName.trim() || 'Player',
    green: 'Emerald Bot',
    yellow: 'Amber Bot',
    blue: 'Cobalt Bot',
  });
  const [seatTypes, setSeatTypes] = useState<Record<PlayerColor, SeatType>>({
    red: 'human',
    green: initialMode === 'pass_and_play' ? 'human' : 'ai',
    yellow: initialMode === 'pass_and_play' ? 'human' : 'ai',
    blue: initialMode === 'pass_and_play' ? 'human' : 'ai',
  });

  const applyDefaults = (nextMode: 'offline_ai' | 'pass_and_play', primaryColor: PlayerColor) => {
    const nextSeats: Record<PlayerColor, SeatType> = {
      red: nextMode === 'pass_and_play' ? 'human' : 'ai',
      green: nextMode === 'pass_and_play' ? 'human' : 'ai',
      yellow: nextMode === 'pass_and_play' ? 'human' : 'ai',
      blue: nextMode === 'pass_and_play' ? 'human' : 'ai',
    };
    nextSeats[primaryColor] = 'human';

    const nextNames: Record<PlayerColor, string> = {
      red: nextMode === 'pass_and_play' ? 'Crimson Player' : 'Crimson Bot',
      green: nextMode === 'pass_and_play' ? 'Emerald Player' : 'Emerald Bot',
      yellow: nextMode === 'pass_and_play' ? 'Amber Player' : 'Amber Bot',
      blue: nextMode === 'pass_and_play' ? 'Cobalt Player' : 'Cobalt Bot',
    };
    const trimmed = initialPlayerName.trim();
    nextNames[primaryColor] = trimmed || (nextMode === 'pass_and_play' ? 'Player 1' : 'You');

    setSeatTypes(nextSeats);
    setNames(nextNames);
  };

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setChosenColor(initialColor);
    applyDefaults(initialMode, initialColor);
  }, [open, initialMode, initialColor, initialPlayerName]);

  if (!open) return null;

  const activeColors = getColorsForPlayerCount(playerCount, chosenColor);

  const handleModeSwitch = (next: 'offline_ai' | 'pass_and_play') => {
    soundEngine.playClick();
    setMode(next);
    applyDefaults(next, chosenColor);
  };

  const handleColorPick = (color: PlayerColor) => {
    soundEngine.playClick();
    setChosenColor(color);
    applyDefaults(mode, color);
  };

  const handleLaunch = () => {
    soundEngine.playClick();
    const seats: PlayerSeatConfig[] = activeColors.map((color) => ({
      color,
      name: names[color] || COLOR_META[color].defaultName,
      seatType: seatTypes[color] ?? (mode === 'pass_and_play' ? 'human' : 'ai'),
      difficulty,
    }));
    onStartMatch(mode, seats);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-setup-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#131A27] border border-slate-700/80 p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 id="offline-setup-title" className="font-display text-xl font-bold text-white">
              Offline Match Setup
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your color, players &amp; difficulty · No internet needed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Offline Setup"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeSwitch('offline_ai')}
              className={`py-2.5 rounded-lg text-xs font-semibold min-h-[40px] transition-colors ${
                mode === 'offline_ai' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              vs Computer AI
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('pass_and_play')}
              className={`py-2.5 rounded-lg text-xs font-semibold min-h-[40px] transition-colors ${
                mode === 'pass_and_play' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Pass &amp; Play
            </button>
          </div>

          {/* Choose Your Color */}
          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">Choose Your Color</div>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_ORDER.map((c) => {
                const meta = COLOR_META[c];
                const selected = chosenColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorPick(c)}
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all min-h-[72px] ${
                      selected
                        ? 'bg-slate-800 text-white scale-[1.03]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    style={{
                      borderColor: selected ? meta.hex : undefined,
                      boxShadow: selected ? `0 0 16px ${meta.hex}45` : undefined,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full border-2 border-white/80"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <span className="text-xs font-bold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Count */}
          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">Number of Players</div>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setPlayerCount(cnt);
                  }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] transition-colors ${
                    playerCount === cnt
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {cnt} Players
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          {activeColors.some((c) => seatTypes[c] === 'ai') && (
            <div>
              <div className="text-xs font-medium text-slate-300 mb-2">Computer AI Difficulty</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['easy', 'normal', 'hard', 'expert'] as AIDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setDifficulty(d);
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border min-h-[40px] transition-colors ${
                      difficulty === d
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player Seats Configuration */}
          <div className="space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Player Seats</div>
            {activeColors.map((color) => {
              const isHuman = seatTypes[color] === 'human';
              return (
                <div
                  key={color}
                  className="p-2.5 rounded-2xl bg-slate-900/75 border border-slate-800 flex items-center gap-3"
                >
                  <PlayerAvatar color={color} name={names[color]} size="sm" active={color === chosenColor} />
                  <input
                    type="text"
                    maxLength={18}
                    value={names[color]}
                    onChange={(e) => setNames((prev) => ({ ...prev, [color]: e.target.value }))}
                    aria-label={`${COLOR_META[color].label} player name`}
                    className="flex-1 min-w-0 bg-transparent text-sm font-medium text-white border-b border-transparent focus:border-amber-400 focus:outline-none py-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSeatTypes((prev) => ({
                        ...prev,
                        [color]: prev[color] === 'human' ? 'ai' : 'human',
                      }));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] shrink-0 transition-colors ${
                      isHuman
                        ? 'bg-slate-800 text-white border border-slate-600'
                        : 'bg-slate-800/60 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isHuman ? <User className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>{isHuman ? 'Human' : 'AI Bot'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm min-h-[48px] transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};
