import React, { useEffect, useMemo, useRef } from 'react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import {
  COLOR_META,
  HOME_COLUMN_CELLS,
  LudoGameState,
  OUTER_TRACK_CELLS,
  PlayerColor,
  STAR_SAFE_INDICES,
  getTokenBoardCoord,
} from '../shared/ludoEngine';
import { BOARD_THEMES, BoardThemeId, GRAPHICS_PRESETS, GraphicsQuality } from '../shared/themes';

interface LudoBoard2DProps {
  gameState: LudoGameState;
  themeId: BoardThemeId;
  quality: GraphicsQuality;
  canInteract: boolean;
  lightsEnabled?: boolean;
  onSelectToken: (tokenId: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function getCellFill(
  row: number,
  col: number,
  theme: (typeof BOARD_THEMES)[BoardThemeId]
): { fill: string; isStart?: PlayerColor; isStar?: boolean; isHomeLane?: PlayerColor } {
  // Check home columns (progress 51..55)
  for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
    if (HOME_COLUMN_CELLS[color].some(([r, c]) => r === row && c === col)) {
      return { fill: COLOR_META[color].hex, isHomeLane: color };
    }
  }

  // Check outer track start squares
  const trackIdx = OUTER_TRACK_CELLS.findIndex(([r, c]) => r === row && c === col);
  if (trackIdx === 0) return { fill: COLOR_META.red.hex, isStart: 'red' };
  if (trackIdx === 13) return { fill: COLOR_META.green.hex, isStart: 'green' };
  if (trackIdx === 26) return { fill: COLOR_META.yellow.hex, isStart: 'yellow' };
  if (trackIdx === 39) return { fill: COLOR_META.blue.hex, isStart: 'blue' };
  if (trackIdx >= 0 && STAR_SAFE_INDICES.has(trackIdx)) {
    return { fill: theme.trackAlt, isStar: true };
  }

  const alt = (row + col) % 2 === 1;
  return { fill: alt ? theme.trackAlt : theme.trackLight };
}

export const LudoBoard2D: React.FC<LudoBoard2DProps> = ({
  gameState,
  themeId,
  quality,
  canInteract,
  lightsEnabled = true,
  onSelectToken,
}) => {
  const theme = BOARD_THEMES[themeId];
  const preset = GRAPHICS_PRESETS[quality];
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastBurstTimestampRef = useRef<number>(0);

  const activePlayer = gameState.players[gameState.activeColorIndex];
  const activeColor = activePlayer.color;
  const legalSet = useMemo(() => new Set(gameState.legalTokenIds), [gameState.legalTokenIds]);

  // Spawn particle bursts on significant game events (capture, home, win, 6-enter)
  useEffect(() => {
    const evt = gameState.lastEvent;
    if (!evt || !preset.particlesEnabled) return;
    if (evt.timestamp === lastBurstTimestampRef.current) return;
    lastBurstTimestampRef.current = evt.timestamp;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = particleCanvasRef.current;
    if (!canvas) return;

    const countBase =
      evt.type === 'win' ? 75 : evt.type === 'capture' ? 38 : evt.type === 'home' ? 32 : evt.type === 'enter' ? 18 : 0;
    const count = Math.round(countBase * preset.particleCountMultiplier);
    if (count <= 0) return;

    const coord =
      evt.type === 'win'
        ? [7.5, 7.5]
        : evt.toProgress !== undefined
          ? getTokenBoardCoord(evt.color, evt.tokenId ?? 0, evt.toProgress)
          : [7.5, 7.5];

    const cx = (coord[1] / 15) * canvas.width;
    const cy = (coord[0] / 15) * canvas.height;
    const palette =
      evt.type === 'win'
        ? ['#F59E0B', '#E11D48', '#10B981', '#3B82F6', '#FDE68A']
        : [COLOR_META[evt.color].hex, '#FDE68A', '#FFFFFF'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = (1.5 + Math.random() * 4.5) * (canvas.width / 500);
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 34 + Math.random() * 26,
        size: (2.5 + Math.random() * 3.5) * (canvas.width / 500),
        color: palette[i % palette.length],
      });
    }
  }, [gameState.lastEvent, preset.particlesEnabled, preset.particleCountMultiplier]);

  // Particle animation loop
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(1, Math.floor(rect.width * Math.min(window.devicePixelRatio || 1, preset.resolutionScale)));
      const targetH = Math.max(1, Math.floor(rect.height * Math.min(window.devicePixelRatio || 1, preset.resolutionScale)));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life += 1;
        if (p.life < p.maxLife) {
          const alpha = 1 - p.life / p.maxLife;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          alive.push(p);
        }
      }
      ctx.globalAlpha = 1;
      particlesRef.current = alive;
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [preset.resolutionScale]);

  // Group tokens occupying the same board coordinate so stacked pieces fan neatly
  const tokenRenderList = useMemo(() => {
    const coordGroups = new Map<string, { color: PlayerColor; tokenId: number; progress: number; row: number; col: number }[]>();

    for (const player of gameState.players) {
      for (const token of player.tokens) {
        const [row, col] = getTokenBoardCoord(player.color, token.id, token.progress);
        const key = `${row.toFixed(2)},${col.toFixed(2)}`;
        const arr = coordGroups.get(key) ?? [];
        arr.push({ color: player.color, tokenId: token.id, progress: token.progress, row, col });
        coordGroups.set(key, arr);
      }
    }

    const items: {
      color: PlayerColor;
      tokenId: number;
      progress: number;
      xPct: number;
      yPct: number;
      scale: number;
      isLegal: boolean;
    }[] = [];

    coordGroups.forEach((group) => {
      const count = group.length;
      group.forEach((item, idx) => {
        let dx = 0;
        let dy = 0;
        let scale = 1;
        if (count > 1) {
          const angle = (Math.PI * 2 * idx) / count - Math.PI / 4;
          const radius = count === 2 ? 0.16 : 0.21;
          dx = Math.cos(angle) * radius;
          dy = Math.sin(angle) * radius;
          scale = count >= 3 ? 0.78 : 0.86;
        }
        const isLegal =
          canInteract &&
          gameState.phase === 'MOVE' &&
          item.color === activeColor &&
          legalSet.has(item.tokenId);

        items.push({
          color: item.color,
          tokenId: item.tokenId,
          progress: item.progress,
          xPct: ((item.col + dx) / 15) * 100,
          yPct: ((item.row + dy) / 15) * 100,
          scale,
          isLegal,
        });
      });
    });

    // Render legal/active tokens on top
    items.sort((a, b) => Number(a.isLegal) - Number(b.isLegal));
    return items;
  }, [gameState.players, gameState.phase, activeColor, legalSet, canInteract]);

  const trackCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        // Skip 4 corner 6x6 yards and 3x3 center goal
        const inTopLeft = r < 6 && c < 6;
        const inTopRight = r < 6 && c >= 9;
        const inBottomLeft = r >= 9 && c < 6;
        const inBottomRight = r >= 9 && c >= 9;
        const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
        if (inTopLeft || inTopRight || inBottomLeft || inBottomRight || inCenter) continue;

        const info = getCellFill(r, c, theme);
        const isColored = Boolean(info.isStart || info.isHomeLane);

        cells.push(
          <g key={`c-${r}-${c}`}>
            <rect
              x={c * 40}
              y={r * 40}
              width={40}
              height={40}
              fill={info.fill}
              stroke={isColored ? 'rgba(255,255,255,0.28)' : theme.trackBorder}
              strokeWidth={1}
            />
            {info.isStar && (
              <polygon
                points={`${c * 40 + 20},${r * 40 + 7} ${c * 40 + 24},${r * 40 + 15} ${c * 40 + 33},${r * 40 + 16} ${c * 40 + 26.5},${r * 40 + 22.5} ${c * 40 + 28},${r * 40 + 31.5} ${c * 40 + 20},${r * 40 + 27} ${c * 40 + 12},${r * 40 + 31.5} ${c * 40 + 13.5},${r * 40 + 22.5} ${c * 40 + 7},${r * 40 + 16} ${c * 40 + 16},${r * 40 + 15}`}
                fill="none"
                stroke="#475569"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {info.isStart && (
              <circle
                cx={c * 40 + 20}
                cy={r * 40 + 20}
                r={10}
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2.2}
              />
            )}
          </g>
        );
      }
    }
    return cells;
  }, [theme]);

  const yards: { color: PlayerColor; x: number; y: number }[] = [
    { color: 'red', x: 0, y: 0 },
    { color: 'green', x: 360, y: 0 },
    { color: 'yellow', x: 360, y: 360 },
    { color: 'blue', x: 0, y: 360 },
  ];

  const activeHex = COLOR_META[activeColor].hex;

  const spotlightCornerPos: Record<PlayerColor, string> = {
    red: '20% 20%',
    green: '80% 20%',
    yellow: '80% 80%',
    blue: '20% 80%',
  };

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* Dynamic Arena Ambient Rim Glow */}
      {lightsEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 rounded-[2rem] opacity-65 blur-xl transition-all duration-500"
          style={{
            background: `radial-gradient(circle at ${spotlightCornerPos[activeColor]}, ${activeHex}66 0%, rgba(245, 158, 11, 0.16) 45%, transparent 75%)`,
          }}
        />
      )}

      {/* Board Beveled Frame */}
      <div
        className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 transition-all duration-300"
        style={{
          backgroundColor: theme.boardFrame,
          border: `2px solid ${lightsEnabled ? activeHex : theme.boardFrameTrim}`,
          boxShadow: lightsEnabled
            ? `0 22px 54px rgba(0, 0, 0, 0.65), 0 0 28px ${activeHex}40, inset 0 1px 0 rgba(255, 255, 255, 0.16)`
            : preset.shadowsEnabled
              ? '0 24px 54px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
              : '0 8px 20px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Top Engraved AB Studios Signboard inside Virtual Environment */}
        <div
          className="mb-1.5 sm:mb-2 px-3 py-1 rounded-lg flex items-center justify-between text-[11px] font-display font-bold tracking-[0.16em]"
          style={{
            backgroundColor: theme.signboardBg,
            color: theme.signboardText,
            border: `1px solid ${theme.signboardBorder}`,
            boxShadow: lightsEnabled ? `inset 0 0 12px ${activeHex}28` : undefined,
          }}
        >
          <span>{OFFICIAL_BRANDING.studioName.toUpperCase()}</span>
          <span className="text-[10px] opacity-85 font-sans tracking-wider">{OFFICIAL_BRANDING.gameName}</span>
        </div>

        {/* Square 15x15 Board Canvas */}
        <div
          className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900"
          style={{
            boxShadow: lightsEnabled ? `inset 0 0 24px ${activeHex}33` : undefined,
          }}
        >
          <svg
            viewBox="0 0 600 600"
            className="w-full h-full block"
            role="img"
            aria-label="AB Ludo Offline Game Board"
          >
            <defs>
              <filter id="neonSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track Cells */}
            {trackCells}

            {/* Subtle Neon Accent Guide Lines on Board Arms */}
            {lightsEnabled && (
              <g pointerEvents="none" opacity="0.72" filter="url(#neonSoftGlow)">
                <rect x={241} y={1} width={118} height={238} fill="none" stroke={COLOR_META.green.lightHex} strokeWidth={1.6} />
                <rect x={361} y={241} width={238} height={118} fill="none" stroke={COLOR_META.yellow.lightHex} strokeWidth={1.6} />
                <rect x={241} y={361} width={118} height={238} fill="none" stroke={COLOR_META.blue.lightHex} strokeWidth={1.6} />
                <rect x={1} y={241} width={238} height={118} fill="none" stroke={COLOR_META.red.lightHex} strokeWidth={1.6} />
              </g>
            )}

            {/* 4 Corner Home Yards */}
            {yards.map(({ color, x, y }) => {
              const meta = COLOR_META[color];
              const isTurn = activeColor === color && gameState.phase !== 'FINISHED';
              const isSeated = gameState.players.some((p) => p.color === color);
              return (
                <g key={color} opacity={isSeated ? 1 : 0.55}>
                  <rect
                    x={x}
                    y={y}
                    width={240}
                    height={240}
                    fill={meta.hex}
                    stroke={isTurn && lightsEnabled ? '#FFFFFF' : 'rgba(15,23,42,0.35)'}
                    strokeWidth={isTurn ? 4 : 2}
                  />
                  <rect
                    x={x + 28}
                    y={y + 28}
                    width={184}
                    height={184}
                    rx={20}
                    fill={theme.yardInnerBg}
                    stroke={lightsEnabled ? meta.lightHex : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isTurn ? 3.5 : 2}
                    filter={lightsEnabled ? 'url(#neonSoftGlow)' : undefined}
                  />
                  {/* 4 Token Pedestal Sockets */}
                  {[
                    [66, 66],
                    [174, 66],
                    [66, 174],
                    [174, 174],
                  ].map(([sx, sy], i) => (
                    <g key={i}>
                      <circle
                        cx={x + sx}
                        cy={y + sy}
                        r={26}
                        fill="rgba(255,255,255,0.08)"
                        stroke={lightsEnabled ? meta.lightHex : meta.hex}
                        strokeWidth={2.5}
                      />
                      <circle
                        cx={x + sx}
                        cy={y + sy}
                        r={18}
                        fill={`${meta.hex}36`}
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Center 3x3 Home Goal Triangles */}
            <g filter={lightsEnabled ? 'url(#neonSoftGlow)' : undefined}>
              {/* Red Left Triangle */}
              <polygon points="240,240 300,300 240,360" fill={COLOR_META.red.hex} stroke="#0F172A" strokeWidth={1.5} />
              {/* Green Top Triangle */}
              <polygon points="240,240 360,240 300,300" fill={COLOR_META.green.hex} stroke="#0F172A" strokeWidth={1.5} />
              {/* Yellow Right Triangle */}
              <polygon points="360,240 360,360 300,300" fill={COLOR_META.yellow.hex} stroke="#0F172A" strokeWidth={1.5} />
              {/* Blue Bottom Triangle */}
              <polygon points="240,360 300,300 360,360" fill={COLOR_META.blue.hex} stroke="#0F172A" strokeWidth={1.5} />
              {/* Center AB Crest Medallion */}
              <circle cx={300} cy={300} r={22} fill={theme.signboardBg} stroke={theme.signboardBorder} strokeWidth={2.5} />
              <text
                x={300}
                y={305}
                textAnchor="middle"
                fill={theme.signboardText}
                fontSize="14"
                fontWeight="800"
                fontFamily="Outfit, sans-serif"
              >
                AB
              </text>
            </g>
          </svg>

          {/* Soft In-Board Turn Spotlight Overlay */}
          {lightsEnabled && gameState.phase !== 'FINISHED' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-all duration-500"
              style={{
                background: `radial-gradient(circle at ${spotlightCornerPos[activeColor]}, ${activeHex}2E 0%, transparent 50%)`,
              }}
            />
          )}

          {/* Animated Tokens Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {tokenRenderList.map((item) => {
              const meta = COLOR_META[item.color];
              const isFinished = item.progress === 56;
              return (
                <button
                  key={`${item.color}-${item.tokenId}`}
                  type="button"
                  disabled={!item.isLegal}
                  onClick={() => item.isLegal && onSelectToken(item.tokenId)}
                  aria-label={`${meta.label} token ${item.tokenId + 1}${item.isLegal ? ' - Tap to move' : ''}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-white ${
                    item.isLegal
                      ? 'pointer-events-auto cursor-pointer z-20'
                      : 'pointer-events-none z-10'
                  }`}
                  style={{
                    left: `${item.xPct}%`,
                    top: `${item.yPct}%`,
                    width: '10%',
                    height: '10%',
                    minWidth: item.isLegal ? '40px' : undefined,
                    minHeight: item.isLegal ? '40px' : undefined,
                  }}
                >
                  {item.isLegal && (
                    <span
                      className="token-playable-ring absolute inset-0 rounded-full border-2 border-white shadow-[0_0_16px_rgba(255,255,255,0.9)]"
                      style={{ backgroundColor: `${meta.hex}55` }}
                    />
                  )}
                  <span
                    className="relative rounded-full flex items-center justify-center transition-transform duration-200"
                    style={{
                      width: `${Math.round(62 * item.scale)}%`,
                      height: `${Math.round(62 * item.scale)}%`,
                      background: `radial-gradient(circle at 32% 28%, ${meta.lightHex}, ${meta.hex} 58%, ${meta.darkHex} 100%)`,
                      border: `2px solid ${item.isLegal ? '#FFFFFF' : 'rgba(255,255,255,0.9)'}`,
                      boxShadow: lightsEnabled
                        ? `0 0 12px ${meta.hex}AA, 0 4px 10px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(0,0,0,0.3)`
                        : preset.shadowsEnabled
                          ? '0 4px 10px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(0,0,0,0.35)'
                          : '0 2px 4px rgba(0,0,0,0.45)',
                      transform: item.isLegal ? 'scale(1.16)' : isFinished ? 'scale(0.82)' : 'scale(1)',
                    }}
                  >
                    <span className="w-[42%] h-[42%] rounded-full bg-white/90 shadow-inner" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Particle Effects Layer */}
          <canvas
            ref={particleCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          />
        </div>
      </div>
    </div>
  );
};
