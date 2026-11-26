import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  AIDifficulty,
  LudoGameState,
  PlayerColor,
  PlayerSeatConfig,
  applyDiceRoll,
  applyTokenMove,
  chooseAIMove,
  createInitialGameState,
  getColorsForPlayerCount,
  hasSingleDistinctChoice,
} from './src/shared/ludoEngine.ts';

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Confined server-side data persistence for Online Leaderboards
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEADERBOARD_FILE = path.resolve(DATA_DIR, 'leaderboard.json');

interface LeaderboardEntry {
  playerKey: string;
  name: string;
  wins: number;
  matches: number;
  captures: number;
  rating: number;
  updatedAt: number;
}

function ensureLeaderboardFile(): LeaderboardEntry[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!LEADERBOARD_FILE.startsWith(DATA_DIR + path.sep)) {
      return [];
    }
    if (!fs.existsSync(LEADERBOARD_FILE)) {
      const seed: LeaderboardEntry[] = [
        { playerKey: 'aj_champion', name: 'Malik_Grandmaster', wins: 18, matches: 24, captures: 62, rating: 1480, updatedAt: Date.now() - 86400000 },
        { playerKey: 'zara_tactician', name: 'ZaraK_Pro', wins: 14, matches: 21, captures: 49, rating: 1395, updatedAt: Date.now() - 43200000 },
        { playerKey: 'hamza_ace', name: 'Hamza_Vanguard', wins: 11, matches: 19, captures: 38, rating: 1310, updatedAt: Date.now() - 21600000 },
        { playerKey: 'ayesha_royal', name: 'Ayesha_Crown', wins: 9, matches: 15, captures: 31, rating: 1265, updatedAt: Date.now() - 7200000 },
      ];
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let leaderboard: LeaderboardEntry[] = ensureLeaderboardFile();

function saveLeaderboard() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (LEADERBOARD_FILE.startsWith(DATA_DIR + path.sep)) {
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard.slice(0, 100), null, 2), 'utf8');
    }
  } catch {
    // Non-fatal persistence fallback
  }
}

function sanitizePlayerName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Guest Player';
  const cleaned = raw.replace(/[<>&"'`]/g, '').trim().slice(0, 20);
  return cleaned.length >= 2 ? cleaned : 'Guest Player';
}

function recordMatchOnLeaderboard(state: LudoGameState) {
  if (state.phase !== 'FINISHED' || !state.winnerColor) return;
  for (const player of state.players) {
    if (player.seatType === 'ai') continue;
    const key = player.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24) || 'guest';
    let entry = leaderboard.find((e) => e.playerKey === key);
    if (!entry) {
      entry = {
        playerKey: key,
        name: player.name,
        wins: 0,
        matches: 0,
        captures: 0,
        rating: 1000,
        updatedAt: Date.now(),
      };
      leaderboard.push(entry);
    }
    entry.name = player.name;
    entry.matches += 1;
    entry.captures += player.captures;
    if (player.color === state.winnerColor) {
      entry.wins += 1;
      entry.rating += 35 + player.captures * 2;
    } else {
      entry.rating = Math.max(800, entry.rating + player.captures - 10);
    }
    entry.updatedAt = Date.now();
  }
  leaderboard.sort((a, b) => b.rating - a.rating || b.wins - a.wins);
  saveLeaderboard();
}

interface RoomMember {
  playerToken: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  connected: boolean;
  ws: WebSocket | null;
}

interface MultiplayerRoom {
  code: string;
  isPublic: boolean;
  maxPlayers: 2 | 3 | 4;
  status: 'lobby' | 'playing' | 'finished';
  hostToken: string;
  members: RoomMember[];
  gameState: LudoGameState | null;
  aiFillDifficulty: AIDifficulty;
  createdAt: number;
  aiTimer?: ReturnType<typeof setTimeout>;
  leaderboardRecorded?: boolean;
}

const rooms = new Map<string, MultiplayerRoom>();
const socketToMember = new Map<WebSocket, { roomCode: string; playerToken: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoom(room: MultiplayerRoom) {
  return {
    code: room.code,
    isPublic: room.isPublic,
    maxPlayers: room.maxPlayers,
    status: room.status,
    members: room.members.map((m) => ({
      name: m.name,
      color: m.color,
      isHost: m.isHost,
      connected: m.connected,
    })),
    gameState: room.gameState,
  };
}

function broadcastRoom(room: MultiplayerRoom, extraPayload: Record<string, unknown> = {}) {
  const payload = JSON.stringify({
    type: 'room_update',
    room: serializeRoom(room),
    ...extraPayload,
  });
  for (const m of room.members) {
    if (m.ws && m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(payload);
    }
  }
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function scheduleServerAITurnIfNeeded(room: MultiplayerRoom) {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = undefined;
  }
  const state = room.gameState;
  if (!state || state.phase === 'FINISHED') return;

  const activePlayer = state.players[state.activeColorIndex];
  if (activePlayer.seatType !== 'ai') return;

  room.aiTimer = setTimeout(() => {
    if (!room.gameState || room.gameState.phase === 'FINISHED') return;
    const current = room.gameState;
    const curPlayer = current.players[current.activeColorIndex];
    if (curPlayer.seatType !== 'ai') return;

    if (current.phase === 'ROLL') {
      const roll = crypto.randomInt(1, 7);
      const afterRoll = applyDiceRoll(current, roll);
      room.gameState = afterRoll;
      broadcastRoom(room, { diceRolled: roll });
      scheduleServerAITurnIfNeeded(room);
    } else if (current.phase === 'MOVE') {
      const tokenId = chooseAIMove(current, curPlayer.difficulty);
      if (tokenId >= 0) {
        const afterMove = applyTokenMove(current, tokenId);
        room.gameState = afterMove;
        if (afterMove.phase === 'FINISHED') {
          room.status = 'finished';
          if (!room.leaderboardRecorded) {
            room.leaderboardRecorded = true;
            recordMatchOnLeaderboard(afterMove);
          }
        }
        broadcastRoom(room);
        scheduleServerAITurnIfNeeded(room);
      }
    }
  }, 680);
}

function startMatchInRoom(room: MultiplayerRoom, fillWithAI: boolean) {
  const colors = getColorsForPlayerCount(room.maxPlayers);
  const seats: PlayerSeatConfig[] = [];

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const member = room.members.find((m) => m.color === color);
    if (member) {
      seats.push({
        color,
        name: member.name,
        seatType: 'human',
        difficulty: 'normal',
      });
    } else if (fillWithAI) {
      seats.push({
        color,
        name: `AB Bot (${color.toUpperCase()})`,
        seatType: 'ai',
        difficulty: room.aiFillDifficulty,
      });
    }
  }

  if (seats.length < 2) return;
  room.status = 'playing';
  room.leaderboardRecorded = false;
  room.gameState = createInitialGameState(room.code, 'online', seats);
  broadcastRoom(room);
  scheduleServerAITurnIfNeeded(room);
}

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.isPublic && r.status === 'lobby' && r.members.length < r.maxPlayers)
      .map((r) => ({
        code: r.code,
        maxPlayers: r.maxPlayers,
        playerCount: r.members.length,
        hostName: r.members.find((m) => m.isHost)?.name ?? 'Host',
        createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ rooms: publicRooms });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({ entries: leaderboard.slice(0, 30) });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(rawData));
      } catch {
        sendError(ws, 'Malformed message payload.');
        return;
      }

      const type = msg.type;

      if (type === 'create_room') {
        const playerName = sanitizePlayerName(msg.playerName);
        const maxPlayers = msg.maxPlayers === 2 || msg.maxPlayers === 3 || msg.maxPlayers === 4 ? msg.maxPlayers : 4;
        const isPublic = Boolean(msg.isPublic);
        const aiDifficulty: AIDifficulty =
          msg.aiDifficulty === 'easy' || msg.aiDifficulty === 'hard' || msg.aiDifficulty === 'expert'
            ? msg.aiDifficulty
            : 'normal';

        const code = generateRoomCode();
        const playerToken = crypto.randomBytes(16).toString('hex');
        const colors = getColorsForPlayerCount(maxPlayers);

        const room: MultiplayerRoom = {
          code,
          isPublic,
          maxPlayers,
          status: 'lobby',
          hostToken: playerToken,
          members: [
            {
              playerToken,
              name: playerName,
              color: colors[0],
              isHost: true,
              connected: true,
              ws,
            },
          ],
          gameState: null,
          aiFillDifficulty: aiDifficulty,
          createdAt: Date.now(),
        };

        rooms.set(code, room);
        socketToMember.set(ws, { roomCode: code, playerToken });
        ws.send(
          JSON.stringify({
            type: 'joined_room',
            roomCode: code,
            playerToken,
            myColor: colors[0],
            isHost: true,
            room: serializeRoom(room),
          })
        );
        return;
      }

      if (type === 'join_room') {
        const code = typeof msg.roomCode === 'string' ? msg.roomCode.toUpperCase().trim() : '';
        const playerName = sanitizePlayerName(msg.playerName);
        const room = rooms.get(code);
        if (!room) {
          sendError(ws, 'Room not found. Verify the 6-character room code.');
          return;
        }

        // Check reconnection via existing token
        if (typeof msg.playerToken === 'string') {
          const existing = room.members.find((m) => m.playerToken === msg.playerToken);
          if (existing) {
            existing.ws = ws;
            existing.connected = true;
            if (room.gameState) {
              const p = room.gameState.players.find((pl) => pl.color === existing.color);
              if (p) p.connected = true;
            }
            socketToMember.set(ws, { roomCode: code, playerToken: existing.playerToken });
            ws.send(
              JSON.stringify({
                type: 'joined_room',
                roomCode: code,
                playerToken: existing.playerToken,
                myColor: existing.color,
                isHost: existing.isHost,
                room: serializeRoom(room),
              })
            );
            broadcastRoom(room);
            return;
          }
        }

        if (room.status !== 'lobby') {
          sendError(ws, 'Match is already in progress.');
          return;
        }

        const colors = getColorsForPlayerCount(room.maxPlayers);
        const taken = new Set(room.members.map((m) => m.color));
        const nextColor = colors.find((c) => !taken.has(c));
        if (!nextColor) {
          sendError(ws, 'This room is already full.');
          return;
        }

        const playerToken = crypto.randomBytes(16).toString('hex');
        room.members.push({
          playerToken,
          name: playerName,
          color: nextColor,
          isHost: false,
          connected: true,
          ws,
        });
        socketToMember.set(ws, { roomCode: code, playerToken });

        ws.send(
          JSON.stringify({
            type: 'joined_room',
            roomCode: code,
            playerToken,
            myColor: nextColor,
            isHost: false,
            room: serializeRoom(room),
          })
        );
        broadcastRoom(room);
        return;
      }

      if (type === 'quick_match') {
        const playerName = sanitizePlayerName(msg.playerName);
        const preferredCount = msg.maxPlayers === 2 || msg.maxPlayers === 3 || msg.maxPlayers === 4 ? msg.maxPlayers : 4;

        let targetRoom = Array.from(rooms.values()).find(
          (r) =>
            r.isPublic &&
            r.status === 'lobby' &&
            r.maxPlayers === preferredCount &&
            r.members.length < r.maxPlayers
        );

        if (!targetRoom) {
          const code = generateRoomCode();
          const playerToken = crypto.randomBytes(16).toString('hex');
          const colors = getColorsForPlayerCount(preferredCount);
          targetRoom = {
            code,
            isPublic: true,
            maxPlayers: preferredCount,
            status: 'lobby',
            hostToken: playerToken,
            members: [
              {
                playerToken,
                name: playerName,
                color: colors[0],
                isHost: true,
                connected: true,
                ws,
              },
            ],
            gameState: null,
            aiFillDifficulty: 'normal',
            createdAt: Date.now(),
          };
          rooms.set(code, targetRoom);
          socketToMember.set(ws, { roomCode: code, playerToken });
          ws.send(
            JSON.stringify({
              type: 'joined_room',
              roomCode: code,
              playerToken,
              myColor: colors[0],
              isHost: true,
              room: serializeRoom(targetRoom),
            })
          );
          return;
        }

        const colors = getColorsForPlayerCount(targetRoom.maxPlayers);
        const taken = new Set(targetRoom.members.map((m) => m.color));
        const nextColor = colors.find((c) => !taken.has(c));
        if (!nextColor) return;

        const playerToken = crypto.randomBytes(16).toString('hex');
        targetRoom.members.push({
          playerToken,
          name: playerName,
          color: nextColor,
          isHost: false,
          connected: true,
          ws,
        });
        socketToMember.set(ws, { roomCode: targetRoom.code, playerToken });

        ws.send(
          JSON.stringify({
            type: 'joined_room',
            roomCode: targetRoom.code,
            playerToken,
            myColor: nextColor,
            isHost: false,
            room: serializeRoom(targetRoom),
          })
        );
        broadcastRoom(targetRoom);

        // Auto-start public match once full!
        if (targetRoom.members.length === targetRoom.maxPlayers) {
          startMatchInRoom(targetRoom, false);
        }
        return;
      }

      if (type === 'start_match') {
        const info = socketToMember.get(ws);
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room) return;
        if (room.hostToken !== info.playerToken) {
          sendError(ws, 'Only the room host can start the match.');
          return;
        }
        const fillAI = msg.fillAI !== false;
        if (room.members.length < 2 && !fillAI) {
          sendError(ws, 'At least 2 players are required to start.');
          return;
        }
        startMatchInRoom(room, fillAI);
        return;
      }

      if (type === 'roll_dice') {
        const info = socketToMember.get(ws);
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || !room.gameState) return;

        const member = room.members.find((m) => m.playerToken === info.playerToken);
        if (!member) return;

        const state = room.gameState;
        const activePlayer = state.players[state.activeColorIndex];
        // Anti-cheat validation: enforce turn ownership and phase
        if (activePlayer.color !== member.color || state.phase !== 'ROLL') {
          sendError(ws, 'Invalid turn action.');
          return;
        }

        // Server-authoritative cryptographically random 1..6 roll
        const diceValue = crypto.randomInt(1, 7);
        let nextState = applyDiceRoll(state, diceValue);

        // Server-side automatic move when only 1 distinct move exists
        if (nextState.phase === 'MOVE' && hasSingleDistinctChoice(nextState.players[nextState.activeColorIndex], nextState.legalTokenIds)) {
          const singleToken = nextState.legalTokenIds[0];
          room.gameState = nextState;
          broadcastRoom(room, { diceRolled: diceValue });
          setTimeout(() => {
            if (!room.gameState || room.gameState.phase !== 'MOVE') return;
            const autoMoved = applyTokenMove(room.gameState, singleToken);
            room.gameState = autoMoved;
            if (autoMoved.phase === 'FINISHED') {
              room.status = 'finished';
              if (!room.leaderboardRecorded) {
                room.leaderboardRecorded = true;
                recordMatchOnLeaderboard(autoMoved);
              }
            }
            broadcastRoom(room);
            scheduleServerAITurnIfNeeded(room);
          }, 550);
          return;
        }

        room.gameState = nextState;
        broadcastRoom(room, { diceRolled: diceValue });
        scheduleServerAITurnIfNeeded(room);
        return;
      }

      if (type === 'move_token') {
        const info = socketToMember.get(ws);
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || !room.gameState) return;

        const member = room.members.find((m) => m.playerToken === info.playerToken);
        if (!member) return;

        const state = room.gameState;
        const activePlayer = state.players[state.activeColorIndex];
        const tokenId = typeof msg.tokenId === 'number' ? msg.tokenId : -1;

        // Anti-cheat validation: check turn ownership, phase, and legal token set
        if (
          activePlayer.color !== member.color ||
          state.phase !== 'MOVE' ||
          !state.legalTokenIds.includes(tokenId)
        ) {
          sendError(ws, 'Illegal move rejected by server validation.');
          return;
        }

        const nextState = applyTokenMove(state, tokenId);
        room.gameState = nextState;

        if (nextState.phase === 'FINISHED') {
          room.status = 'finished';
          if (!room.leaderboardRecorded) {
            room.leaderboardRecorded = true;
            recordMatchOnLeaderboard(nextState);
          }
        }

        broadcastRoom(room);
        scheduleServerAITurnIfNeeded(room);
        return;
      }

      if (type === 'rematch') {
        const info = socketToMember.get(ws);
        if (!info) return;
        const room = rooms.get(info.roomCode);
        if (!room || room.hostToken !== info.playerToken) return;
        startMatchInRoom(room, true);
        return;
      }
    });

    ws.on('close', () => {
      const info = socketToMember.get(ws);
      socketToMember.delete(ws);
      if (!info) return;
      const room = rooms.get(info.roomCode);
      if (!room) return;
      const member = room.members.find((m) => m.playerToken === info.playerToken);
      if (member) {
        member.connected = false;
        member.ws = null;
        if (room.gameState) {
          const p = room.gameState.players.find((pl) => pl.color === member.color);
          if (p) p.connected = false;
        }
        broadcastRoom(room);
      }
    });
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AJ LUDO server listening on http://localhost:${PORT}`);
  });
}

bootstrap();
