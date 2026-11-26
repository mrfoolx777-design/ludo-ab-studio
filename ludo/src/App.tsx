import { useCallback, useEffect, useRef, useState } from 'react';
import { GameArena } from './components/GameArena';
import { LeaderboardView } from './components/LeaderboardView';
import { MainMenu } from './components/MainMenu';
import { OfflineSetupModal } from './components/OfflineSetupModal';
import { OnlineLobbyModal, OnlineRoomSnapshot } from './components/OnlineLobbyModal';
import { SettingsAndAboutModal } from './components/SettingsAndAboutModal';
import { SplashScreen } from './components/SplashScreen';
import {
  AIDifficulty,
  LudoGameState,
  PlayerColor,
  PlayerSeatConfig,
  createInitialGameState,
  getColorsForPlayerCount,
} from './shared/ludoEngine';
import { BoardThemeId, GraphicsQuality, ViewDimension } from './shared/themes';
import { soundEngine } from './utils/audio';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<2 | 3 | 4>(4);
  const [lightsEnabled, setLightsEnabled] = useState(true);
  const quality: GraphicsQuality = 'high';
  const [themeId, setThemeId] = useState<BoardThemeId>('royal_obsidian');
  const [viewDimension, setViewDimension] = useState<ViewDimension>('2d');
  const [muted, setMuted] = useState(false);

  const [gameState, setGameState] = useState<LudoGameState | null>(null);
  const [lastOfflineConfig, setLastOfflineConfig] = useState<{
    mode: 'offline_ai' | 'pass_and_play';
    seats: PlayerSeatConfig[];
  } | null>(null);

  // Modals
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineInitialMode, setOfflineInitialMode] = useState<'offline_ai' | 'pass_and_play'>('offline_ai');
  const [onlineModalOpen, setOnlineModalOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'themes' | 'rules' | 'about'>('themes');

  // Online Multiplayer WebSocket State
  const [playerName, setPlayerName] = useState('Player');
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomSnapshot | null>(null);
  const [myOnlineColor, setMyOnlineColor] = useState<PlayerColor | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectInfoRef = useRef<{ roomCode: string; playerToken: string; playerName: string } | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setOnlineError(null);
      if (reconnectInfoRef.current) {
        ws.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: reconnectInfoRef.current.roomCode,
            playerToken: reconnectInfoRef.current.playerToken,
            playerName: reconnectInfoRef.current.playerName,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'error') {
          setOnlineError(msg.message || 'Server error');
          return;
        }
        if (msg.type === 'joined_room') {
          setOnlineError(null);
          setMyOnlineColor(msg.myColor);
          setIsHost(Boolean(msg.isHost));
          setOnlineRoom(msg.room);
          reconnectInfoRef.current = {
            roomCode: msg.roomCode,
            playerToken: msg.playerToken,
            playerName,
          };
          if (msg.room?.gameState) {
            setGameState(msg.room.gameState);
            setOnlineModalOpen(false);
          }
          return;
        }
        if (msg.type === 'room_update') {
          setOnlineRoom(msg.room);
          if (msg.room?.gameState) {
            setGameState(msg.room.gameState);
            setOnlineModalOpen(false);
          }
        }
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Automatic reconnection when user has an active online room session
      if (reconnectInfoRef.current) {
        setTimeout(() => {
          connectWebSocket();
        }, 1600);
      }
    };
  }, [playerName]);

  useEffect(() => {
    if (onlineModalOpen) {
      connectWebSocket();
    }
  }, [onlineModalOpen, connectWebSocket]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const startOfflineMatch = (mode: 'offline_ai' | 'pass_and_play', seats: PlayerSeatConfig[]) => {
    setOfflineModalOpen(false);
    setLastOfflineConfig({ mode, seats });
    const state = createInitialGameState(`offline-${Date.now()}`, mode, seats);
    setGameState(state);
  };

  const handleQuickPlayOffline = () => {
    const colors = getColorsForPlayerCount(selectedPlayerCount, selectedColor);
    const botNames: Record<PlayerColor, string> = {
      red: 'Crimson Bot',
      green: 'Emerald Bot',
      yellow: 'Amber Bot',
      blue: 'Cobalt Bot',
    };
    const resolvedName = playerName.trim() || 'Player';
    const seats: PlayerSeatConfig[] = colors.map((c, idx) => ({
      color: c,
      name: idx === 0 ? resolvedName : botNames[c],
      seatType: idx === 0 ? 'human' : 'ai',
      difficulty: 'normal',
    }));
    startOfflineMatch('offline_ai', seats);
  };

  const handleRestartOffline = () => {
    if (!lastOfflineConfig) return;
    setGameState(
      createInitialGameState(`offline-${Date.now()}`, lastOfflineConfig.mode, lastOfflineConfig.seats)
    );
  };

  const sendWs = (payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleLeaveOnlineRoom = () => {
    reconnectInfoRef.current = null;
    setOnlineRoom(null);
    setMyOnlineColor(null);
    setIsHost(false);
    setGameState(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {gameState ? (
        <GameArena
          gameState={gameState}
          setGameState={setGameState}
          myOnlineColor={myOnlineColor}
          roomCode={onlineRoom?.code ?? null}
          isHost={isHost}
          onOnlineRoll={() => sendWs({ type: 'roll_dice' })}
          onOnlineMove={(tokenId) => sendWs({ type: 'move_token', tokenId })}
          onOnlineRematch={() => sendWs({ type: 'rematch' })}
          onRestartOffline={handleRestartOffline}
          onExitToMenu={() => {
            if (gameState.mode === 'online') {
              handleLeaveOnlineRoom();
            } else {
              setGameState(null);
            }
          }}
          themeId={themeId}
          quality={quality}
          viewDimension={viewDimension}
          setViewDimension={setViewDimension}
          lightsEnabled={lightsEnabled}
          onToggleLights={() => setLightsEnabled((v) => !v)}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => {
            setSettingsTab('themes');
            setSettingsOpen(true);
          }}
        />
      ) : (
        <MainMenu
          playerName={playerName}
          setPlayerName={setPlayerName}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          selectedPlayerCount={selectedPlayerCount}
          setSelectedPlayerCount={setSelectedPlayerCount}
          themeId={themeId}
          viewDimension={viewDimension}
          setViewDimension={setViewDimension}
          lightsEnabled={lightsEnabled}
          onToggleLights={() => setLightsEnabled((v) => !v)}
          muted={muted}
          onToggleMute={handleToggleMute}
          onQuickPlayOffline={handleQuickPlayOffline}
          onOpenOfflineSetup={(mode) => {
            setOfflineInitialMode(mode);
            setOfflineModalOpen(true);
          }}
          onOpenOnlineLobby={() => setOnlineModalOpen(true)}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenSettings={(tab) => {
            setSettingsTab(tab);
            setSettingsOpen(true);
          }}
        />
      )}

      <OfflineSetupModal
        open={offlineModalOpen}
        initialMode={offlineInitialMode}
        initialColor={selectedColor}
        initialPlayerName={playerName}
        onStartMatch={startOfflineMatch}
        onClose={() => setOfflineModalOpen(false)}
      />

      <OnlineLobbyModal
        open={onlineModalOpen}
        playerName={playerName}
        setPlayerName={setPlayerName}
        wsConnected={wsConnected}
        room={onlineRoom}
        myColor={myOnlineColor}
        isHost={isHost}
        errorMsg={onlineError}
        onCreateRoom={(maxPlayers, isPublic, aiDifficulty: AIDifficulty) =>
          sendWs({ type: 'create_room', playerName, maxPlayers, isPublic, aiDifficulty })
        }
        onJoinRoom={(roomCode) => sendWs({ type: 'join_room', roomCode, playerName })}
        onQuickMatch={(maxPlayers) => sendWs({ type: 'quick_match', playerName, maxPlayers })}
        onStartMatch={(fillAI) => sendWs({ type: 'start_match', fillAI })}
        onLeaveRoom={handleLeaveOnlineRoom}
        onClose={() => setOnlineModalOpen(false)}
      />

      <LeaderboardView open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />

      <SettingsAndAboutModal
        open={settingsOpen}
        initialTab={settingsTab}
        themeId={themeId}
        setThemeId={setThemeId}
        viewDimension={viewDimension}
        setViewDimension={setViewDimension}
        lightsEnabled={lightsEnabled}
        onToggleLights={() => setLightsEnabled((v) => !v)}
        muted={muted}
        onToggleMute={handleToggleMute}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
