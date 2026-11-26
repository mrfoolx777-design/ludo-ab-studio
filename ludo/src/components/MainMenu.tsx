import React, { useState } from 'react';
import {
  BookOpen,
  Box,
  Cpu,
  Globe,
  Layers,
  Lightbulb,
  Palette,
  Play,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import { COLOR_META, COLOR_ORDER, PlayerColor } from '../shared/ludoEngine';
import {
  BOARD_THEMES,
  BoardThemeId,
  ViewDimension,
} from '../shared/themes';
import { soundEngine } from '../utils/audio';
import { ABLogo, PlayerAvatar } from './AJLogo';

const HERO_TABLETOP_PHOTO = '/src/assets/images/hero_ab_ludo_tabletop_1795709974036.jpg';
const DICE_SPOTLIGHT_PHOTO = '/src/assets/images/ludo_dice_spotlight_photo_1795709974425.jpg';

const PRESET_PLAYER_NAMES = ['Champion', 'Striker', 'Royal', 'Ace'] as const;

interface MainMenuProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedColor: PlayerColor;
  setSelectedColor: (color: PlayerColor) => void;
  selectedPlayerCount: 2 | 3 | 4;
  setSelectedPlayerCount: (count: 2 | 3 | 4) => void;
  themeId: BoardThemeId;
  viewDimension: ViewDimension;
  setViewDimension: (dim: ViewDimension) => void;
  lightsEnabled: boolean;
  onToggleLights: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onQuickPlayOffline: () => void;
  onOpenOfflineSetup: (mode: 'offline_ai' | 'pass_and_play') => void;
  onOpenOnlineLobby: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: (tab: 'themes' | 'rules' | 'about') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  selectedColor,
  setSelectedColor,
  selectedPlayerCount,
  setSelectedPlayerCount,
  themeId,
  viewDimension,
  setViewDimension,
  lightsEnabled,
  onToggleLights,
  muted,
  onToggleMute,
  onQuickPlayOffline,
  onOpenOfflineSetup,
  onOpenOnlineLobby,
  onOpenLeaderboard,
  onOpenSettings,
}) => {
  const [heroImgErr, setHeroImgErr] = useState(false);
  const [diceImgErr, setDiceImgErr] = useState(false);

  const activeTheme = BOARD_THEMES[themeId];
  const selectedHex = COLOR_META[selectedColor].hex;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#0B0F17] text-slate-100 overflow-x-hidden">
      {/* Ambient Stage Lights Behind Home Page */}
      {lightsEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 22% 18%, ${selectedHex}28 0%, transparent 45%), radial-gradient(circle at 82% 24%, rgba(245, 158, 11, 0.16) 0%, transparent 42%), radial-gradient(circle at 50% 85%, rgba(16, 185, 129, 0.10) 0%, transparent 50%)`,
          }}
        />
      )}

      {/* Top Bar Contract: 3 Zones */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[#0E131D]/90 px-4 sm:px-8 py-3.5 pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => e.preventDefault()}
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            {OFFICIAL_BRANDING.gameName}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => onOpenOfflineSetup('offline_ai')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Offline
            </button>
            <button
              type="button"
              onClick={onOpenOnlineLobby}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Online
            </button>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings('rules')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Rules
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings('about')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              AB Studios
            </button>
          </nav>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onQuickPlayOffline();
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 min-h-[44px] transition-colors"
          >
            Play Now
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-7">
        {/* Hero Card: Clear Simple Quick-Start + Atmospheric Tabletop Photo */}
        <section
          className="relative rounded-3xl bg-[#121825]/95 border overflow-hidden grid lg:grid-cols-[1.08fr_0.92fr] items-stretch transition-all duration-500"
          style={{
            borderColor: lightsEnabled ? `${selectedHex}66` : 'rgba(30, 41, 59, 0.9)',
            boxShadow: lightsEnabled ? `0 24px 60px rgba(0,0,0,0.6), 0 0 36px ${selectedHex}24` : undefined,
          }}
        >
          {/* Left: Simple 3-Step Quick Play */}
          <div className="p-5 sm:p-8 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <ABLogo size="lg" showStudio />

              <div>
                <div className="text-xs font-semibold tracking-[0.22em] text-amber-400">
                  {OFFICIAL_BRANDING.tagline}
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1.5">
                  Write Your Name &amp; Play Offline
                </h1>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Enter or pick your name, choose your bright neon board color, and start playing right away.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Step 1: Write or Choose Your Name */}
              <div>
                <label htmlFor="home-player-name" className="block text-xs font-semibold text-slate-300 mb-2">
                  1. Your Name (Write or Choose)
                </label>
                <div className="space-y-2">
                  <input
                    id="home-player-name"
                    type="text"
                    maxLength={18}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Write your name..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-amber-400 focus:outline-none text-sm font-semibold text-white placeholder:text-slate-500 min-h-[44px] transition-colors"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_PLAYER_NAMES.map((preset) => {
                      const active = playerName.trim() === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setPlayerName(preset);
                          }}
                          className={`px-2 py-2 rounded-xl text-xs font-semibold border min-h-[40px] whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Color */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  2. Choose Your Color
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_ORDER.map((c) => {
                    const meta = COLOR_META[c];
                    const active = selectedColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedColor(c);
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all min-h-[68px] ${
                          active
                            ? 'bg-slate-800 text-white scale-[1.03]'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        style={{
                          borderColor: active ? meta.hex : undefined,
                          boxShadow: active && lightsEnabled ? `0 0 18px ${meta.hex}66` : undefined,
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-full border-2 border-white/85"
                          style={{ backgroundColor: meta.hex }}
                        />
                        <span className="text-xs font-bold">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Choose Player Count */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  3. Players
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([2, 3, 4] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedPlayerCount(cnt);
                      }}
                      className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold border min-h-[44px] transition-colors ${
                        selectedPlayerCount === cnt
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cnt} Players
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Play Action */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onQuickPlayOffline();
                  }}
                  className="flex-1 min-w-[200px] px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 min-h-[50px] transition-colors whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Offline ({COLOR_META[selectedColor].label})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenOfflineSetup('offline_ai');
                  }}
                  className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm min-h-[50px] transition-colors whitespace-nowrap"
                >
                  More Options
                </button>
              </div>
            </div>
          </div>

          {/* Right: Atmospheric Tabletop Photo + Quick Light & View Controls */}
          <div className="relative min-h-[260px] lg:min-h-full bg-[#0C111B] overflow-hidden">
            {!heroImgErr ? (
              <img
                src={HERO_TABLETOP_PHOTO}
                alt="AB Ludo Offline luxury board with glowing lights and dice"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                <ABLogo size="xl" showStudio />
              </div>
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0E131D] via-black/35 to-transparent"
            />
            {lightsEnabled && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 transition-all duration-500"
                style={{
                  background: `radial-gradient(circle at 60% 40%, ${selectedHex}33 0%, transparent 65%)`,
                }}
              />
            )}

            {/* Quick Bar Floating Cleanly at Bottom of Photo */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-200 font-medium">
                {activeTheme.name}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onToggleLights();
                  }}
                  aria-label={lightsEnabled ? 'Turn off lights' : 'Turn on lights'}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] border transition-colors ${
                    lightsEnabled
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Lights</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setViewDimension(viewDimension === '2d' ? '3d' : '2d');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white flex items-center gap-1.5 min-h-[40px]"
                >
                  {viewDimension === '2d' ? <Layers className="w-3.5 h-3.5 text-amber-400" /> : <Box className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{viewDimension.toUpperCase()}</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-900/90 border border-slate-700 hover:bg-slate-800 flex items-center justify-center text-white"
                >
                  {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Simple 3-Card Game Modes */}
        <section aria-label="Game Modes" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenOfflineSetup('offline_ai');
            }}
            className="group text-left rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 hover:border-amber-500/50 p-5 transition-colors flex flex-col justify-between gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Play vs Computer
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Offline matches against Easy, Normal, Hard, or Expert AI.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenOfflineSetup('pass_and_play');
            }}
            className="group text-left rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 hover:border-amber-500/50 p-5 transition-colors flex flex-col justify-between gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Pass &amp; Play
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Share one phone with 2 to 4 friends offline.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenOnlineLobby();
            }}
            className="group text-left rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 hover:border-emerald-500/50 p-5 transition-colors flex flex-col justify-between gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Online Multiplayer
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Join rooms with friends using a 6-character code or quick match.
              </p>
            </div>
          </button>
        </section>

        {/* Visual Showcase: Dice Spotlight Photo + 4 Playable Champions */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#121825] min-h-[210px]">
            {!diceImgErr ? (
              <img
                src={DICE_SPOTLIGHT_PHOTO}
                alt="Luxury Ludo dice and tokens under studio lights"
                referrerPolicy="no-referrer"
                onError={() => setDiceImgErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 p-6 flex items-center justify-center text-slate-400 text-sm">
                {OFFICIAL_BRANDING.gameName}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-5">
              <h3 className="font-display text-lg font-bold text-white">
                3D Dice &amp; Arena Lighting
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Switch between 2D HD and 3D WebGL anytime with dynamic turn spotlights.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#121825]/95 border border-slate-800 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">Playable Colors &amp; Champions</h3>
              <span className="text-xs text-slate-400">Tap to select</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {COLOR_ORDER.map((c) => {
                const meta = COLOR_META[c];
                const isSelected = selectedColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedColor(c);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all min-h-[60px] ${
                      isSelected
                        ? 'bg-slate-800/95 border-amber-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                    }`}
                    style={{
                      borderColor: isSelected ? meta.hex : undefined,
                      boxShadow: isSelected && lightsEnabled ? `0 0 16px ${meta.hex}44` : undefined,
                    }}
                  >
                    <PlayerAvatar color={c} name={meta.defaultName} size="sm" active={isSelected} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{meta.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {isSelected ? 'Selected' : meta.emblem}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Simple Bottom Utility Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenLeaderboard();
            }}
            className="p-4 rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 flex items-center gap-3 text-left min-h-[60px] transition-colors"
          >
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Leaderboard</div>
              <div className="text-[11px] text-slate-400 truncate">Top players</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings('rules');
            }}
            className="p-4 rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 flex items-center gap-3 text-left min-h-[60px] transition-colors"
          >
            <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Game Rules</div>
              <div className="text-[11px] text-slate-400 truncate">How to play</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings('themes');
            }}
            className="p-4 rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 flex items-center gap-3 text-left min-h-[60px] transition-colors"
          >
            <Palette className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Board Themes</div>
              <div className="text-[11px] text-slate-400 truncate">{activeTheme.name}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings('about');
            }}
            className="p-4 rounded-2xl bg-[#121825]/95 hover:bg-[#171F30] border border-slate-800 flex items-center gap-3 text-left min-h-[60px] transition-colors"
          >
            <ABLogo size="sm" showStudio={false} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">AB Studios</div>
              <div className="text-[11px] text-slate-400 truncate">Rules &amp; Credits</div>
            </div>
          </button>
        </section>
      </main>

      {/* Permanent Official Studio Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/70 px-4 sm:px-8 py-4 pb-safe text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-slate-300">
            {OFFICIAL_BRANDING.gameName} · {OFFICIAL_BRANDING.studioName}
          </span>
          <span>
            Developed by <strong className="text-amber-400">{OFFICIAL_BRANDING.developerName}</strong> · {OFFICIAL_BRANDING.tagline}
          </span>
        </div>
      </footer>
    </div>
  );
};
