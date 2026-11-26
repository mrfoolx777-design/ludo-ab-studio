import React, { useEffect, useState } from 'react';
import { Check, Copy, Globe, Lock, RefreshCw, Users, X } from 'lucide-react';
import { AIDifficulty, COLOR_META, PlayerColor } from '../shared/ludoEngine';
import { soundEngine } from '../utils/audio';

export interface PublicRoomSummary {
  code: string;
  maxPlayers: 2 | 3 | 4;
  playerCount: number;
  hostName: string;
  createdAt: number;
}

export interface RoomMemberInfo {
  name: string;
  color: PlayerColor;
  isHost: boolean;
  connected: boolean;
}

export interface OnlineRoomSnapshot {
  code: string;
  isPublic: boolean;
  maxPlayers: 2 | 3 | 4;
  status: 'lobby' | 'playing' | 'finished';
  members: RoomMemberInfo[];
}

interface OnlineLobbyModalProps {
  open: boolean;
  playerName: string;
  setPlayerName: (name: string) => void;
  wsConnected: boolean;
  room: OnlineRoomSnapshot | null;
  myColor: PlayerColor | null;
  isHost: boolean;
  errorMsg: string | null;
  onCreateRoom: (maxPlayers: 2 | 3 | 4, isPublic: boolean, aiDifficulty: AIDifficulty) => void;
  onJoinRoom: (code: string) => void;
  onQuickMatch: (maxPlayers: 2 | 3 | 4) => void;
  onStartMatch: (fillAI: boolean) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  open,
  playerName,
  setPlayerName,
  wsConnected,
  room,
  myColor,
  isHost,
  errorMsg,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onStartMatch,
  onLeaveRoom,
  onClose,
}) => {
  const [tab, setTab] = useState<'quick' | 'create' | 'join' | 'browse'>('quick');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [isPublic, setIsPublic] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch {
      // ignore offline
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (open && tab === 'browse' && !room) {
      void fetchRooms();
    }
  }, [open, tab, room]);

  if (!open) return null;

  const handleCopyCode = () => {
    if (!room) return;
    void navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-lobby-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#131A27] border border-slate-700/80 p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 id="online-lobby-title" className="font-display text-xl font-bold text-white">
              Online Multiplayer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Server-authoritative rooms · {wsConnected ? 'Connected to live server' : 'Connecting…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Online Lobby"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Active Room Waiting Lobby */}
        {room ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-700 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">
                  {room.isPublic ? 'Public Room Code' : 'Private Room Code'}
                </div>
                <div className="font-mono-nums text-2xl font-bold tracking-[0.2em] text-amber-400 mt-0.5">
                  {room.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Seated Players ({room.members.length}/{room.maxPlayers})</span>
                <span>Waiting for host to launch</span>
              </div>
              <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/60 border border-slate-800">
                {room.members.map((m) => (
                  <div key={m.color} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: COLOR_META[m.color].hex }}
                      />
                      <span className="text-sm font-semibold text-white">{m.name}</span>
                      {m.color === myColor && (
                        <span className="text-xs text-amber-400 font-medium">(You)</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {m.isHost ? 'Host' : 'Joined'} · {m.connected ? 'Ready' : 'Reconnecting'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white min-h-[48px]"
              >
                Leave Room
              </button>
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onStartMatch(true);
                  }}
                  className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-slate-950 min-h-[48px]"
                >
                  {room.members.length < room.maxPlayers ? 'Start (+ AI Fill)' : 'Start Match'}
                </button>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-center text-center">
                  Waiting for host…
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Player Display Name */}
            <div>
              <label htmlFor="online-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Your Player Name
              </label>
              <input
                id="online-name"
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter display name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 min-h-[44px]"
              />
            </div>

            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(
                [
                  ['quick', 'Quick'],
                  ['create', 'Create'],
                  ['join', 'Code'],
                  ['browse', 'Public'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setTab(id);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
                    tab === id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'quick' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-300 mb-2">Match Size</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([2, 3, 4] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setMaxPlayers(cnt)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
                          maxPlayers === cnt
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {cnt} Players
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={() => {
                    soundEngine.playClick();
                    onQuickMatch(maxPlayers);
                  }}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm min-h-[48px] transition-colors"
                >
                  Find Random Match
                </button>
              </div>
            )}

            {tab === 'create' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`p-3 rounded-xl border text-left transition-colors min-h-[56px] ${
                      isPublic
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Public Room</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">Listed in lobby</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`p-3 rounded-xl border text-left transition-colors min-h-[56px] ${
                      !isPublic
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Private Room</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">Join via code only</div>
                  </button>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-300 mb-2">Players</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([2, 3, 4] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setMaxPlayers(cnt)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] ${
                          maxPlayers === cnt
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {cnt}P
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-300 mb-2">Bot Fill Difficulty</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['easy', 'normal', 'hard', 'expert'] as AIDifficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAiDifficulty(d)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize border min-h-[40px] ${
                          aiDifficulty === d
                            ? 'bg-slate-700 border-slate-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={() => {
                    soundEngine.playClick();
                    onCreateRoom(maxPlayers, isPublic, aiDifficulty);
                  }}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm min-h-[48px]"
                >
                  Create Room
                </button>
              </div>
            )}

            {tab === 'join' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="room-code-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                    6-Character Room Code
                  </label>
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AJ7K2P"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono-nums text-xl font-bold tracking-[0.25em] text-white uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={!wsConnected || joinCode.trim().length < 4}
                  onClick={() => {
                    soundEngine.playClick();
                    onJoinRoom(joinCode.trim());
                  }}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm min-h-[48px]"
                >
                  Join Room
                </button>
              </div>
            )}

            {tab === 'browse' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Open Public Rooms</span>
                  <button
                    type="button"
                    onClick={() => void fetchRooms()}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 min-h-[36px] px-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {publicRooms.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400">
                    No open public rooms right now. Create one or start Quick Match!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/70 border border-slate-800">
                    {publicRooms.map((r) => (
                      <div key={r.code} className="p-3.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {r.hostName}&rsquo;s Table
                          </div>
                          <div className="text-xs text-slate-400 font-mono-nums mt-0.5 flex items-center gap-2">
                            <span>Code: {r.code}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" /> {r.playerCount}/{r.maxPlayers}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onJoinRoom(r.code);
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 min-h-[40px]"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
