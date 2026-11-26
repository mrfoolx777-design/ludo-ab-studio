export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type GamePhase = 'ROLL' | 'MOVE' | 'FINISHED';
export type SeatType = 'human' | 'ai';

export interface TokenState {
  id: number; // 0..3
  color: PlayerColor;
  /** -1 = in base yard, 0..50 = outer track progress, 51..55 = home stretch, 56 = home goal */
  progress: number;
}

export interface PlayerState {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  difficulty: AIDifficulty;
  avatarId: PlayerColor;
  connected: boolean;
  tokens: TokenState[];
  captures: number;
  sixesRolled: number;
  finishedOrder: number | null; // 1 = 1st place, etc.
}

export interface MoveEvent {
  type: 'enter' | 'move' | 'capture' | 'home' | 'triple_six_forfeit' | 'no_moves' | 'win';
  color: PlayerColor;
  tokenId?: number;
  fromProgress?: number;
  toProgress?: number;
  captured?: { color: PlayerColor; tokenId: number }[];
  diceValue: number;
  extraTurn: boolean;
  timestamp: number;
  message: string;
}

export interface LudoGameState {
  matchId: string;
  mode: 'offline_ai' | 'pass_and_play' | 'online';
  players: PlayerState[];
  activeColorIndex: number;
  phase: GamePhase;
  diceValue: number | null;
  consecutiveSixes: number;
  legalTokenIds: number[];
  winnerColor: PlayerColor | null;
  rankings: PlayerColor[];
  turnNumber: number;
  lastEvent: MoveEvent | null;
}

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_META: Record<
  PlayerColor,
  {
    label: string;
    hex: string;
    darkHex: string;
    lightHex: string;
    emblem: string;
    defaultName: string;
    avatarPath: string;
    startOffset: number;
  }
> = {
  red: {
    label: 'Crimson',
    hex: '#FF1744',
    darkHex: '#B71C1C',
    lightHex: '#FF7597',
    emblem: 'Crown',
    defaultName: 'Crimson Strategist',
    avatarPath: '/src/assets/images/avatar_crimson_strategist_1795708672903.jpg',
    startOffset: 0,
  },
  green: {
    label: 'Emerald',
    hex: '#00E676',
    darkHex: '#047857',
    lightHex: '#69F0AE',
    emblem: 'Compass',
    defaultName: 'Emerald Tactician',
    avatarPath: '/src/assets/images/avatar_emerald_tactician_1795708672362.jpg',
    startOffset: 13,
  },
  yellow: {
    label: 'Amber',
    hex: '#FFD600',
    darkHex: '#B45309',
    lightHex: '#FFFF72',
    emblem: 'Sun',
    defaultName: 'Amber Monarch',
    avatarPath: '/src/assets/images/avatar_amber_monarch_1795708673060.jpg',
    startOffset: 26,
  },
  blue: {
    label: 'Cobalt',
    hex: '#1877FF',
    darkHex: '#1D4ED8',
    lightHex: '#70AEFF',
    emblem: 'Anchor',
    defaultName: 'Cobalt Navigator',
    avatarPath: '/src/assets/images/avatar_cobalt_navigator_1795708673647.jpg',
    startOffset: 39,
  },
};

/** 52 outer track cells [row, col] on a 15x15 Ludo board (clockwise starting at Red start (6,1)) */
export const OUTER_TRACK_CELLS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0..4 (0 = Red Start)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5..10 (8 = Star Safe)
  [0, 7], [0, 8], // 11..12
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 13..17 (13 = Green Start)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18..23 (21 = Star Safe)
  [7, 14], [8, 14], // 24..25
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 26..30 (26 = Yellow Start)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31..36 (34 = Star Safe)
  [14, 7], [14, 6], // 37..38
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 39..43 (39 = Blue Start)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44..49 (47 = Star Safe)
  [7, 0], [6, 0], // 50..51
];

/** 8 safe outer track indices (4 colored start squares + 4 star squares) */
export const SAFE_TRACK_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);
export const STAR_SAFE_INDICES = new Set<number>([8, 21, 34, 47]);

/** 5-cell private home column [row, col] for progress 51..55 */
export const HOME_COLUMN_CELLS: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

/** Continuous [0..15] coordinates for base yard sockets */
export const BASE_YARD_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[1.65, 1.65], [1.65, 4.35], [4.35, 1.65], [4.35, 4.35]],
  green: [[1.65, 10.65], [1.65, 13.35], [4.35, 10.65], [4.35, 13.35]],
  yellow: [[10.65, 10.65], [10.65, 13.35], [13.35, 10.65], [13.35, 13.35]],
  blue: [[10.65, 1.65], [10.65, 4.35], [13.35, 1.65], [13.35, 4.35]],
};

/** Continuous [0..15] coordinates for finished tokens inside the center home triangle */
export const GOAL_COORDS: Record<PlayerColor, [number, number]> = {
  red: [7.5, 6.45],
  green: [6.45, 7.5],
  yellow: [7.5, 8.55],
  blue: [8.55, 7.5],
};

export function getOuterTrackIndex(color: PlayerColor, progress: number): number | null {
  if (progress < 0 || progress > 50) return null;
  return (COLOR_META[color].startOffset + progress) % 52;
}

export function getTokenBoardCoord(color: PlayerColor, tokenId: number, progress: number): [number, number] {
  if (progress < 0) {
    return BASE_YARD_COORDS[color][tokenId];
  }
  if (progress <= 50) {
    const idx = getOuterTrackIndex(color, progress)!;
    const [r, c] = OUTER_TRACK_CELLS[idx];
    return [r + 0.5, c + 0.5];
  }
  if (progress <= 55) {
    const [r, c] = HOME_COLUMN_CELLS[color][progress - 51];
    return [r + 0.5, c + 0.5];
  }
  return GOAL_COORDS[color];
}

export function getColorsForPlayerCount(
  count: 2 | 3 | 4,
  preferredColor: PlayerColor = 'red'
): PlayerColor[] {
  const startIdx = COLOR_ORDER.indexOf(preferredColor);
  const rotated = [
    ...COLOR_ORDER.slice(startIdx),
    ...COLOR_ORDER.slice(0, startIdx),
  ];
  if (count === 2) {
    // Opposite corners on the board (rotated[0] vs rotated[2])
    return [rotated[0], rotated[2]];
  }
  if (count === 3) {
    return [rotated[0], rotated[1], rotated[2]];
  }
  return rotated;
}

export interface PlayerSeatConfig {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  difficulty: AIDifficulty;
}

export function createInitialGameState(
  matchId: string,
  mode: LudoGameState['mode'],
  seatConfigs: PlayerSeatConfig[]
): LudoGameState {
  const players: PlayerState[] = seatConfigs.map((cfg) => ({
    color: cfg.color,
    name: cfg.name.trim() || COLOR_META[cfg.color].defaultName,
    seatType: cfg.seatType,
    difficulty: cfg.difficulty,
    avatarId: cfg.color,
    connected: true,
    tokens: [0, 1, 2, 3].map((id) => ({ id, color: cfg.color, progress: -1 })),
    captures: 0,
    sixesRolled: 0,
    finishedOrder: null,
  }));

  return {
    matchId,
    mode,
    players,
    activeColorIndex: 0,
    phase: 'ROLL',
    diceValue: null,
    consecutiveSixes: 0,
    legalTokenIds: [],
    winnerColor: null,
    rankings: [],
    turnNumber: 1,
    lastEvent: null,
  };
}

export function getLegalTokenIds(player: PlayerState, diceValue: number): number[] {
  if (player.finishedOrder !== null) return [];
  const legal: number[] = [];
  for (const token of player.tokens) {
    if (token.progress === -1) {
      if (diceValue === 6) legal.push(token.id);
    } else if (token.progress < 56) {
      if (token.progress + diceValue <= 56) legal.push(token.id);
    }
  }
  return legal;
}

/** Checks if all legal moves belong only to base tokens (equivalent starting move) or a single token */
export function hasSingleDistinctChoice(player: PlayerState, legalTokenIds: number[]): boolean {
  if (legalTokenIds.length <= 1) return legalTokenIds.length === 1;
  const progresses = new Set(legalTokenIds.map((id) => player.tokens[id].progress));
  return progresses.size === 1 && progresses.has(-1);
}

function getNextActivePlayerIndex(players: PlayerState[], currentIdx: number): number {
  const total = players.length;
  for (let step = 1; step <= total; step++) {
    const candidate = (currentIdx + step) % total;
    if (players[candidate].finishedOrder === null) {
      return candidate;
    }
  }
  return currentIdx;
}

export function applyDiceRoll(state: LudoGameState, diceValue: number): LudoGameState {
  if (state.phase !== 'ROLL' || diceValue < 1 || diceValue > 6) {
    return state;
  }

  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));
  const activePlayer = players[state.activeColorIndex];
  const newConsecutiveSixes = diceValue === 6 ? state.consecutiveSixes + 1 : 0;

  if (diceValue === 6) {
    activePlayer.sixesRolled += 1;
  }

  // Traditional Ludo rule: three consecutive 6s forfeit the turn
  if (newConsecutiveSixes >= 3) {
    const nextIdx = getNextActivePlayerIndex(players, state.activeColorIndex);
    return {
      ...state,
      players,
      activeColorIndex: nextIdx,
      phase: 'ROLL',
      diceValue,
      consecutiveSixes: 0,
      legalTokenIds: [],
      turnNumber: state.turnNumber + 1,
      lastEvent: {
        type: 'triple_six_forfeit',
        color: activePlayer.color,
        diceValue,
        extraTurn: false,
        timestamp: Date.now(),
        message: `${activePlayer.name} rolled three 6s in a row — turn passes!`,
      },
    };
  }

  const legalTokenIds = getLegalTokenIds(activePlayer, diceValue);

  if (legalTokenIds.length === 0) {
    const nextIdx = getNextActivePlayerIndex(players, state.activeColorIndex);
    return {
      ...state,
      players,
      activeColorIndex: nextIdx,
      phase: 'ROLL',
      diceValue,
      consecutiveSixes: 0,
      legalTokenIds: [],
      turnNumber: state.turnNumber + 1,
      lastEvent: {
        type: 'no_moves',
        color: activePlayer.color,
        diceValue,
        extraTurn: false,
        timestamp: Date.now(),
        message: `${activePlayer.name} rolled ${diceValue} with no valid moves.`,
      },
    };
  }

  return {
    ...state,
    players,
    phase: 'MOVE',
    diceValue,
    consecutiveSixes: newConsecutiveSixes,
    legalTokenIds,
    lastEvent: state.lastEvent,
  };
}

export function applyTokenMove(state: LudoGameState, tokenId: number): LudoGameState {
  if (state.phase !== 'MOVE' || state.diceValue === null) {
    return state;
  }
  if (!state.legalTokenIds.includes(tokenId)) {
    return state;
  }

  const diceValue = state.diceValue;
  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));
  const activePlayer = players[state.activeColorIndex];
  const token = activePlayer.tokens[tokenId];
  const fromProgress = token.progress;
  const toProgress = fromProgress === -1 ? 0 : fromProgress + diceValue;
  token.progress = toProgress;

  const capturedList: { color: PlayerColor; tokenId: number }[] = [];
  const targetTrackIdx = getOuterTrackIndex(activePlayer.color, toProgress);

  if (targetTrackIdx !== null && !SAFE_TRACK_INDICES.has(targetTrackIdx)) {
    for (const opp of players) {
      if (opp.color === activePlayer.color) continue;
      for (const oppToken of opp.tokens) {
        const oppTrackIdx = getOuterTrackIndex(opp.color, oppToken.progress);
        if (oppTrackIdx === targetTrackIdx) {
          oppToken.progress = -1;
          capturedList.push({ color: opp.color, tokenId: oppToken.id });
          activePlayer.captures += 1;
        }
      }
    }
  }

  const reachedHome = toProgress === 56;
  const playerFinishedAll = activePlayer.tokens.every((t) => t.progress === 56);
  const rankings = [...state.rankings];
  let winnerColor = state.winnerColor;

  if (playerFinishedAll && activePlayer.finishedOrder === null) {
    const place = rankings.length + 1;
    activePlayer.finishedOrder = place;
    rankings.push(activePlayer.color);
    if (!winnerColor) {
      winnerColor = activePlayer.color;
    }
  }

  // Match finishes as soon as at least 1 player wins (or if only 1 player remains unfinished)
  const unfinishedPlayers = players.filter((p) => p.finishedOrder === null);
  const matchOver = winnerColor !== null || unfinishedPlayers.length <= 1;

  if (matchOver) {
    // Append remaining unfinished players sorted by total progress
    const remainingSorted = [...unfinishedPlayers].sort((a, b) => {
      const sumA = a.tokens.reduce((acc, t) => acc + Math.max(0, t.progress + 1), 0);
      const sumB = b.tokens.reduce((acc, t) => acc + Math.max(0, t.progress + 1), 0);
      return sumB - sumA;
    });
    for (const rem of remainingSorted) {
      if (!rankings.includes(rem.color)) {
        rem.finishedOrder = rankings.length + 1;
        rankings.push(rem.color);
      }
    }

    return {
      ...state,
      players,
      phase: 'FINISHED',
      legalTokenIds: [],
      winnerColor: rankings[0] ?? activePlayer.color,
      rankings,
      lastEvent: {
        type: 'win',
        color: activePlayer.color,
        tokenId,
        fromProgress,
        toProgress,
        captured: capturedList,
        diceValue,
        extraTurn: false,
        timestamp: Date.now(),
        message: `${activePlayer.name} wins the match!`,
      },
    };
  }

  // Extra turn on rolling 6, capturing an opponent, or reaching home
  const extraTurn = diceValue === 6 || capturedList.length > 0 || reachedHome;
  const nextIdx = extraTurn
    ? state.activeColorIndex
    : getNextActivePlayerIndex(players, state.activeColorIndex);

  let eventType: MoveEvent['type'] = 'move';
  let message = `${activePlayer.name} moved token #${tokenId + 1} by ${diceValue}.`;

  if (fromProgress === -1) {
    eventType = 'enter';
    message = `${activePlayer.name} deployed a token onto the board!`;
  } else if (capturedList.length > 0) {
    eventType = 'capture';
    message = `${activePlayer.name} captured ${capturedList.length} opponent token${capturedList.length > 1 ? 's' : ''} — bonus roll!`;
  } else if (reachedHome) {
    eventType = 'home';
    message = `${activePlayer.name} guided a token home — bonus roll!`;
  } else if (extraTurn) {
    message = `${activePlayer.name} rolled 6 — bonus roll!`;
  }

  return {
    ...state,
    players,
    activeColorIndex: nextIdx,
    phase: 'ROLL',
    consecutiveSixes: extraTurn && diceValue === 6 ? state.consecutiveSixes : 0,
    legalTokenIds: [],
    turnNumber: extraTurn ? state.turnNumber : state.turnNumber + 1,
    lastEvent: {
      type: eventType,
      color: activePlayer.color,
      tokenId,
      fromProgress,
      toProgress,
      captured: capturedList,
      diceValue,
      extraTurn,
      timestamp: Date.now(),
      message,
    },
  };
}

/** Smart AI move evaluation supporting Easy, Normal, Hard, and Expert difficulties */
export function chooseAIMove(state: LudoGameState, difficulty: AIDifficulty): number {
  const player = state.players[state.activeColorIndex];
  const legal = state.legalTokenIds;
  if (legal.length === 0) return -1;
  if (legal.length === 1) return legal[0];

  const dice = state.diceValue ?? 1;

  if (difficulty === 'easy') {
    // Mostly random with mild preference to enter board
    const enterToken = legal.find((id) => player.tokens[id].progress === -1);
    if (enterToken !== undefined && Math.random() < 0.6) return enterToken;
    return legal[Math.floor(Math.random() * legal.length)];
  }

  const countThreatsAtTrackIdx = (trackIdx: number | null): number => {
    if (trackIdx === null || SAFE_TRACK_INDICES.has(trackIdx)) return 0;
    let threats = 0;
    for (const opp of state.players) {
      if (opp.color === player.color || opp.finishedOrder !== null) continue;
      for (const t of opp.tokens) {
        if (t.progress < 0 || t.progress > 50) continue;
        const oppIdx = getOuterTrackIndex(opp.color, t.progress)!;
        const dist = (trackIdx - oppIdx + 52) % 52;
        if (dist >= 1 && dist <= 6 && t.progress + dist <= 50) {
          threats += 1;
        }
      }
    }
    return threats;
  };

  let bestId = legal[0];
  let bestScore = -Infinity;

  for (const id of legal) {
    const token = player.tokens[id];
    const fromProg = token.progress;
    const toProg = fromProg === -1 ? 0 : fromProg + dice;
    const fromIdx = getOuterTrackIndex(player.color, fromProg);
    const toIdx = getOuterTrackIndex(player.color, toProg);

    let score = 0;

    // 1. Reaching Home Goal
    if (toProg === 56) {
      score += difficulty === 'expert' ? 140 : 110;
    }

    // 2. Entering Home Column (completely safe!)
    if (fromProg <= 50 && toProg >= 51 && toProg < 56) {
      score += difficulty === 'expert' ? 95 : 75;
    }

    // 3. Capturing opponent tokens
    if (toIdx !== null && !SAFE_TRACK_INDICES.has(toIdx)) {
      let captureCount = 0;
      let maxOppProg = 0;
      for (const opp of state.players) {
        if (opp.color === player.color) continue;
        for (const oppTok of opp.tokens) {
          if (getOuterTrackIndex(opp.color, oppTok.progress) === toIdx) {
            captureCount += 1;
            maxOppProg = Math.max(maxOppProg, oppTok.progress);
          }
        }
      }
      if (captureCount > 0) {
        score += 120 * captureCount + maxOppProg * (difficulty === 'expert' ? 1.5 : 0.8);
      }
    }

    // 4. Deploying from base on a 6
    if (fromProg === -1 && toProg === 0) {
      const activeCount = player.tokens.filter((t) => t.progress >= 0 && t.progress < 56).length;
      score += activeCount === 0 ? 150 : difficulty === 'normal' ? 65 : 58;
    }

    // 5. Safe zone landing
    if (toIdx !== null && SAFE_TRACK_INDICES.has(toIdx)) {
      score += difficulty === 'normal' ? 24 : 42;
    }

    // 6. Hard & Expert threat avoidance & escape logic
    if (difficulty === 'hard' || difficulty === 'expert') {
      const currentThreats = countThreatsAtTrackIdx(fromIdx);
      const nextThreats = countThreatsAtTrackIdx(toIdx);

      // Bonus for escaping danger weighted by how far along the token is
      if (currentThreats > 0 && nextThreats === 0) {
        score += 38 + fromProg * 0.65;
      }

      // Penalty for stepping into danger weighted by token progress
      if (nextThreats > 0) {
        score -= nextThreats * (22 + toProg * 0.55);
      }

      // Penalty for leaving a safe zone unnecessarily if destination is exposed
      if (fromIdx !== null && SAFE_TRACK_INDICES.has(fromIdx) && nextThreats > 0) {
        score -= 26;
      }

      // Expert: look ahead for own follow-up captures or safe chaining
      if (difficulty === 'expert' && toIdx !== null) {
        for (const opp of state.players) {
          if (opp.color === player.color) continue;
          for (const oppTok of opp.tokens) {
            if (oppTok.progress < 0 || oppTok.progress > 50) continue;
            const oppIdx = getOuterTrackIndex(opp.color, oppTok.progress)!;
            const ahead = (oppIdx - toIdx + 52) % 52;
            if (ahead >= 1 && ahead <= 6 && !SAFE_TRACK_INDICES.has(oppIdx)) {
              score += 14; // Stalking position
            }
          }
        }
      }
    }

    // Slight forward progress preference
    score += toProg * 0.35;

    // Small deterministic-friendly jitter on Normal
    if (difficulty === 'normal') {
      score += (Math.random() - 0.5) * 12;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}
