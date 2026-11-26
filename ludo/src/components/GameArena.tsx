import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Cpu,
  Layers,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import {
  COLOR_META,
  LudoGameState,
  PlayerColor,
  applyDiceRoll,
  applyTokenMove,
  chooseAIMove,
  hasSingleDistinctChoice,
} from '../shared/ludoEngine';
import {
  BoardThemeId,
  GraphicsQuality,
  ViewDimension,
} from '../shared/themes';
import { soundEngine } from '../utils/audio';
import { PlayerAvatar } from './AJLogo';
import { Dice3DWidget } from './Dice3DWidget';
import { LudoBoard2D } from './LudoBoard2D';
import { LudoBoard3D } from './LudoBoard3D';

interface GameArenaProps {
  gameState: LudoGameState;
  setGameState: React.Dispatch<React.SetStateAction<LudoGameState | null>>;
  myOnlineColor: PlayerColor | null;
  roomCode: string | null;
  isHost: boolean;
  onOnlineRoll: () => void;
  onOnlineMove: (tokenId: number) => void;
  onOnlineRematch: () => void;
  onRestartOffline: () => void;
  onExitToMenu: () => void;
  themeId: BoardThemeId;
  quality: GraphicsQuality;
  viewDimension: ViewDimension;
  setViewDimension: (dim: ViewDimension) => void;
  lightsEnabled: boolean;
  onToggleLights: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  gameState,
  setGameState,
  myOnlineColor,
  roomCode,
  isHost,
  onOnlineRoll,
  onOnlineMove,
  onOnlineRematch,
  onRestartOffline,
  onExitToMenu,
  themeId,
  quality,
  viewDimension,
  setViewDimension,
  lightsEnabled,
  onToggleLights,
  muted,
  onToggleMute,
  onOpenSettings,
}) => {
  const [rolling, setRolling] = useState(false);
  const lastSoundTsRef = useRef<number>(0);

  const activePlayer = gameState.players[gameState.activeColorIndex];
  const activeHex = COLOR_META[activePlayer.color].hex;
  const isOnline = gameState.mode === 'online';
  const canHumanControlActive =
    gameState.phase !== 'FINISHED' &&
    activePlayer.seatType === 'human' &&
    (!isOnline || activePlayer.color === myOnlineColor);

  // Trigger procedural Web Audio feedback on game events
  useEffect(() => {
    const evt = gameState.lastEvent;
    if (!evt || evt.timestamp === lastSoundTsRef.current) return;
    lastSoundTsRef.current = evt.timestamp;

    if (evt.type === 'win') soundEngine.playVictory();
    else if (evt.type === 'capture') soundEngine.playCapture();
    else if (evt.type === 'home') soundEngine.playHomeReached();
    else if (evt.type === 'enter') soundEngine.playUnlock();
    else if (evt.type === 'move') soundEngine.playStep(evt.diceValue);
  }, [gameState.lastEvent]);

  const handleRollDice = useCallback(() => {
    if (!canHumanControlActive || gameState.phase !== 'ROLL' || rolling) return;

    soundEngine.playDiceRoll();
    setRolling(true);

    if (isOnline) {
      onOnlineRoll();
      setTimeout(() => setRolling(false), 480);
      return;
    }

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setRolling(false);
      setGameState((prev) => {
        if (!prev || prev.phase !== 'ROLL') return prev;
        return applyDiceRoll(prev, rolled);
      });
    }, 480);
  }, [canHumanControlActive, gameState.phase, rolling, isOnline, onOnlineRoll, setGameState]);

  const handleSelectToken = useCallback(
    (tokenId: number) => {
      if (!canHumanControlActive || gameState.phase !== 'MOVE') return;
      if (!gameState.legalTokenIds.includes(tokenId)) return;

      if (isOnline) {
        onOnlineMove(tokenId);
        return;
      }

      setGameState((prev) => {
        if (!prev || prev.phase !== 'MOVE') return prev;
        return applyTokenMove(prev, tokenId);
      });
    },
    [canHumanControlActive, gameState.phase, gameState.legalTokenIds, isOnline, onOnlineMove, setGameState]
  );

  // Offline automatic single-move execution when only 1 distinct valid move exists
  useEffect(() => {
    if (isOnline || gameState.phase !== 'MOVE') return;
    if (activePlayer.seatType !== 'human') return;
    if (!hasSingleDistinctChoice(activePlayer, gameState.legalTokenIds)) return;

    const timer = setTimeout(() => {
      const tokenId = gameState.legalTokenIds[0];
      setGameState((prev) => {
        if (!prev || prev.phase !== 'MOVE') return prev;
        return applyTokenMove(prev, tokenId);
      });
    }, 460);

    return () => clearTimeout(timer);
  }, [isOnline, gameState.phase, gameState.legalTokenIds, activePlayer, setGameState]);

  // Offline smart Computer AI turn driver
  useEffect(() => {
    if (isOnline || gameState.phase === 'FINISHED') return;
    if (activePlayer.seatType !== 'ai') return;

    if (gameState.phase === 'ROLL') {
      const t1 = setTimeout(() => {
        soundEngine.playDiceRoll();
        setRolling(true);
      }, 420);

      const t2 = setTimeout(() => {
        const rolled = Math.floor(Math.random() * 6) + 1;
        setRolling(false);
        setGameState((prev) => {
          if (!prev || prev.phase !== 'ROLL') return prev;
          return applyDiceRoll(prev, rolled);
        });
      }, 920);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (gameState.phase === 'MOVE') {
      const t = setTimeout(() => {
        setGameState((prev) => {
          if (!prev || prev.phase !== 'MOVE') return prev;
          const aiPlayer = prev.players[prev.activeColorIndex];
          const chosen = chooseAIMove(prev, aiPlayer.difficulty);
          if (chosen < 0) return prev;
          return applyTokenMove(prev, chosen);
        });
      }, 560);
      return () => clearTimeout(t);
    }
  }, [isOnline, gameState.phase, gameState.turnNumber, gameState.activeColorIndex, activePlayer, setGameState]);

  const statusText = (() => {
    if (gameState.phase === 'FINISHED') {
      const winner = gameState.players.find((p) => p.color === gameState.winnerColor);
      return `${winner?.name ?? 'Player'} won the match`;
    }
    if (rolling) return `${activePlayer.name} is rolling the dice…`;
    if (gameState.phase === 'ROLL') {
      return canHumanControlActive
        ? 'Your turn — Tap dice to roll'
        : activePlayer.seatType === 'ai'
          ? `${activePlayer.name} (${activePlayer.difficulty}) is rolling…`
          : `Waiting for ${activePlayer.name} to roll`;
    }
    if (canHumanControlActive) {
      return hasSingleDistinctChoice(activePlayer, gameState.legalTokenIds)
        ? `Rolled ${gameState.diceValue} — Auto-moving token…`
        : `Rolled ${gameState.diceValue} — Tap a glowing token`;
    }
    return `${activePlayer.name} rolled ${gameState.diceValue} — Moving…`;
  })();

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#0B0F17] text-slate-100 overflow-hidden">
      {/* Arena Ambient Stage Lights Backdrop */}
      {lightsEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${activeHex}24 0%, rgba(245, 158, 11, 0.08) 38%, transparent 72%)`,
          }}
        />
      )}

      {/* Compact Arena Top Bar */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[#0E131D]/95 px-3 sm:px-6 py-2.5 pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExitToMenu();
              }}
              aria-label="Back to Main Menu"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm sm:text-base text-white truncate">
                {OFFICIAL_BRANDING.gameName}
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span>{isOnline ? `Room ${roomCode}` : gameState.mode === 'pass_and_play' ? 'Pass & Play' : 'Offline vs AI'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 2D / 3D Switch */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setViewDimension('2d');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap min-h-[36px] ${
                  viewDimension === '2d'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setViewDimension('3d');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap min-h-[36px] ${
                  viewDimension === '3d'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
            </div>

            {/* Arena Lights Toggle */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onToggleLights();
              }}
              aria-label={lightsEnabled ? 'Turn off arena lights' : 'Turn on arena lights'}
              title={lightsEnabled ? 'Arena Lights On' : 'Arena Lights Off'}
              className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors ${
                lightsEnabled
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenSettings();
              }}
              aria-label="Theme & Studio Settings"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Arena Grid: Player Roster + Center Board */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col lg:grid lg:grid-cols-[260px_1fr_260px] lg:items-center gap-3 sm:gap-5">
        {/* Player Strip */}
        <section aria-label="Players" className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {gameState.players.map((p, idx) => {
            const meta = COLOR_META[p.color];
            const isTurn = idx === gameState.activeColorIndex && gameState.phase !== 'FINISHED';
            const homeCount = p.tokens.filter((t) => t.progress === 56).length;
            const isMe = isOnline && p.color === myOnlineColor;
            return (
              <div
                key={p.color}
                className={`rounded-2xl p-2.5 transition-all duration-300 flex items-center gap-2.5 ${
                  isTurn ? 'bg-slate-800/95' : 'bg-slate-900/75 opacity-80'
                }`}
                style={{
                  border: `1.5px solid ${isTurn ? meta.hex : 'rgba(51, 65, 85, 0.7)'}`,
                  boxShadow: isTurn && lightsEnabled ? `0 0 18px ${meta.hex}38` : undefined,
                }}
              >
                <PlayerAvatar color={p.color} name={p.name} size="sm" active={isTurn} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-white truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-semibold text-amber-400 shrink-0">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono-nums">
                    <span className="inline-flex items-center gap-1">
                      {p.seatType === 'ai' ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {p.seatType === 'ai' ? p.difficulty : p.connected ? 'Live' : 'Offline'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Home {homeCount}/4</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Central Board Viewport */}
        <section className="w-full flex items-center justify-center">
          {viewDimension === '2d' ? (
            <LudoBoard2D
              gameState={gameState}
              themeId={themeId}
              quality={quality}
              canInteract={canHumanControlActive}
              lightsEnabled={lightsEnabled}
              onSelectToken={handleSelectToken}
            />
          ) : (
            <LudoBoard3D
              gameState={gameState}
              themeId={themeId}
              quality={quality}
              canInteract={canHumanControlActive}
              rolling={rolling}
              lightsEnabled={lightsEnabled}
              onSelectToken={handleSelectToken}
            />
          )}
        </section>

        {/* Desktop Right Rail */}
        <section
          className="hidden lg:flex flex-col gap-4 rounded-3xl bg-[#131926]/95 border p-5 transition-all duration-300"
          style={{
            borderColor: lightsEnabled ? `${activeHex}66` : 'rgb(30, 41, 59)',
            boxShadow: lightsEnabled ? `0 0 28px ${activeHex}22` : undefined,
          }}
        >
          <div>
            <div className="text-xs font-medium text-slate-400">Turn {gameState.turnNumber}</div>
            <h2 className="font-display text-xl font-bold text-white mt-0.5">
              {activePlayer.name}
            </h2>
            <p className="text-sm text-slate-300 mt-1">{statusText}</p>
          </div>

          <div className="flex items-center justify-center py-4 border-y border-slate-800/80">
            <Dice3DWidget
              value={gameState.diceValue}
              rolling={rolling}
              canRoll={canHumanControlActive && gameState.phase === 'ROLL'}
              activeColor={activePlayer.color}
              onRoll={handleRollDice}
            />
          </div>

          {gameState.lastEvent && (
            <div className="text-xs text-slate-300 leading-relaxed">
              {gameState.lastEvent.message}
            </div>
          )}

          {canHumanControlActive && gameState.phase === 'MOVE' && gameState.legalTokenIds.length > 1 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {gameState.legalTokenIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectToken(id)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white transition-colors min-h-[40px]"
                >
                  Move Token #{id + 1}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Natural Thumb-Zone Dice & Action Dock */}
      <footer
        className="lg:hidden sticky bottom-0 z-30 border-t bg-[#0E131D]/95 px-4 py-2.5 pb-safe transition-colors duration-300"
        style={{
          borderColor: lightsEnabled ? `${activeHex}55` : 'rgba(30, 41, 59, 0.9)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-nums">
              <span>Turn {gameState.turnNumber}</span>
              <span aria-hidden="true">·</span>
              <span style={{ color: COLOR_META[activePlayer.color].lightHex }} className="font-semibold truncate">
                {activePlayer.name}
              </span>
            </div>
            <p className="text-sm font-medium text-white truncate mt-0.5">{statusText}</p>
            {gameState.lastEvent && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{gameState.lastEvent.message}</p>
            )}
          </div>

          <Dice3DWidget
            value={gameState.diceValue}
            rolling={rolling}
            canRoll={canHumanControlActive && gameState.phase === 'ROLL'}
            activeColor={activePlayer.color}
            onRoll={handleRollDice}
          />
        </div>
      </footer>

      {/* Match Result Podium Modal */}
      {gameState.phase === 'FINISHED' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-result-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#131A27] border border-amber-500/40 p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mb-3">
                <Trophy className="w-7 h-7" />
              </div>
              <h2 id="match-result-title" className="font-display text-2xl font-extrabold text-white">
                Match Complete
              </h2>
              <p className="text-sm text-amber-300 mt-1 font-medium">
                {gameState.players.find((p) => p.color === gameState.winnerColor)?.name} claims Victory!
              </p>
            </div>

            <div className="mt-5 divide-y divide-slate-800 border-y border-slate-800">
              {gameState.rankings.map((color, rankIdx) => {
                const p = gameState.players.find((pl) => pl.color === color);
                if (!p) return null;
                return (
                  <div key={color} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-nums font-bold text-sm w-6 text-amber-400">
                        #{rankIdx + 1}
                      </span>
                      <PlayerAvatar color={p.color} name={p.name} size="sm" active={rankIdx === 0} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono-nums">
                          {p.captures} captures · {p.sixesRolled} sixes
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 shrink-0">
                      {p.tokens.filter((t) => t.progress === 56).length}/4 Home
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExitToMenu();
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white min-h-[48px] transition-colors"
              >
                Main Menu
              </button>
              {(!isOnline || isHost) && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    if (isOnline) onOnlineRematch();
                    else onRestartOffline();
                  }}
                  className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-slate-950 min-h-[48px] flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
