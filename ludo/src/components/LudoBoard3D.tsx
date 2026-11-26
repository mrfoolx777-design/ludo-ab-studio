import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
import {
  BOARD_THEMES,
  BoardThemeId,
  GRAPHICS_PRESETS,
  GraphicsQuality,
  resolveSafeTextureSize,
} from '../shared/themes';

interface LudoBoard3DProps {
  gameState: LudoGameState;
  themeId: BoardThemeId;
  quality: GraphicsQuality;
  canInteract: boolean;
  rolling: boolean;
  lightsEnabled?: boolean;
  onSelectToken: (tokenId: number) => void;
}

type CameraPreset = 'isometric' | 'top' | 'low';

// Pre-allocated scratch helpers outside loop (zero GC)
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _targetVec = new THREE.Vector3();

function boardCoordToWorld(row: number, col: number): [number, number] {
  // Map [0..15] to [-7.5..7.5] centered at 0
  return [col - 7.5, row - 7.5];
}

function createProceduralBoardTexture(
  themeId: BoardThemeId,
  texSize: number
): THREE.CanvasTexture {
  const theme = BOARD_THEMES[themeId];
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d')!;
  const cell = texSize / 15;

  // Base background
  ctx.fillStyle = theme.trackLight;
  ctx.fillRect(0, 0, texSize, texSize);

  // Draw 15x15 cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const alt = (r + c) % 2 === 1;
      ctx.fillStyle = alt ? theme.trackAlt : theme.trackLight;
      ctx.fillRect(c * cell, r * cell, cell, cell);
      ctx.strokeStyle = theme.trackBorder;
      ctx.lineWidth = Math.max(1, texSize / 600);
      ctx.strokeRect(c * cell, r * cell, cell, cell);
    }
  }

  // Color home columns with crisp bright borders
  (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).forEach((color) => {
    const meta = COLOR_META[color];
    HOME_COLUMN_CELLS[color].forEach(([r, c]) => {
      ctx.fillStyle = meta.hex;
      ctx.fillRect(c * cell, r * cell, cell, cell);
      ctx.strokeStyle = 'rgba(255,255,255,0.68)';
      ctx.lineWidth = Math.max(1.5, texSize / 480);
      ctx.strokeRect(c * cell, r * cell, cell, cell);
    });
  });

  // Start squares
  const starts: [number, PlayerColor][] = [
    [0, 'red'],
    [13, 'green'],
    [26, 'yellow'],
    [39, 'blue'],
  ];
  starts.forEach(([idx, color]) => {
    const [r, c] = OUTER_TRACK_CELLS[idx];
    ctx.fillStyle = COLOR_META[color].hex;
    ctx.fillRect(c * cell, r * cell, cell, cell);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2.5, texSize / 320);
    ctx.beginPath();
    ctx.arc((c + 0.5) * cell, (r + 0.5) * cell, cell * 0.25, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Star safe zones
  STAR_SAFE_INDICES.forEach((idx) => {
    const [r, c] = OUTER_TRACK_CELLS[idx];
    const cx = (c + 0.5) * cell;
    const cy = (r + 0.5) * cell;
    const outerR = cell * 0.34;
    const innerR = cell * 0.15;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(2, texSize / 420);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  });

  // 4 Corner Yards with bright colors & subtle neon inner perimeter
  const yards: [PlayerColor, number, number][] = [
    ['red', 0, 0],
    ['green', 9, 0],
    ['yellow', 9, 9],
    ['blue', 0, 9],
  ];
  yards.forEach(([color, col, row]) => {
    const meta = COLOR_META[color];
    ctx.fillStyle = meta.hex;
    ctx.fillRect(col * cell, row * cell, 6 * cell, 6 * cell);

    ctx.fillStyle = theme.yardInnerBg;
    const pad = cell * 0.72;
    ctx.save();
    ctx.shadowColor = meta.lightHex;
    ctx.shadowBlur = texSize / 64;
    ctx.fillRect(col * cell + pad, row * cell + pad, 6 * cell - pad * 2, 6 * cell - pad * 2);
    ctx.strokeStyle = meta.lightHex;
    ctx.lineWidth = Math.max(2, texSize / 320);
    ctx.strokeRect(col * cell + pad, row * cell + pad, 6 * cell - pad * 2, 6 * cell - pad * 2);
    ctx.restore();

    const sockets = [
      [col + 1.65, row + 1.65],
      [col + 4.35, row + 1.65],
      [col + 1.65, row + 4.35],
      [col + 4.35, row + 4.35],
    ];
    sockets.forEach(([sc, sr]) => {
      ctx.beginPath();
      ctx.arc(sc * cell, sr * cell, cell * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = `${meta.hex}42`;
      ctx.fill();
      ctx.strokeStyle = meta.lightHex;
      ctx.lineWidth = Math.max(2, texSize / 330);
      ctx.stroke();
    });
  });

  // Center 3x3 Goal Triangles
  const x0 = 6 * cell;
  const y0 = 6 * cell;
  const x1 = 9 * cell;
  const y1 = 9 * cell;
  const midX = 7.5 * cell;
  const midY = 7.5 * cell;

  const drawTri = (p1: [number, number], p2: [number, number], p3: [number, number], color: string) => {
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = Math.max(1.5, texSize / 480);
    ctx.stroke();
  };

  drawTri([x0, y0], [midX, midY], [x0, y1], COLOR_META.red.hex);
  drawTri([x0, y0], [x1, y0], [midX, midY], COLOR_META.green.hex);
  drawTri([x1, y0], [x1, y1], [midX, midY], COLOR_META.yellow.hex);
  drawTri([x0, y1], [midX, midY], [x1, y1], COLOR_META.blue.hex);

  // Center Medallion
  ctx.beginPath();
  ctx.arc(midX, midY, cell * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = theme.signboardBg;
  ctx.fill();
  ctx.strokeStyle = theme.signboardBorder;
  ctx.lineWidth = Math.max(2, texSize / 320);
  ctx.stroke();

  ctx.fillStyle = theme.signboardText;
  ctx.font = `800 ${Math.round(cell * 0.42)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AB', midX, midY + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSignboardTexture(themeId: BoardThemeId): THREE.CanvasTexture {
  const theme = BOARD_THEMES[themeId];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = theme.signboardBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = theme.signboardBorder;
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = theme.signboardText;
  ctx.font = '800 54px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${OFFICIAL_BRANDING.studioName.toUpperCase()}  ·  ${OFFICIAL_BRANDING.gameName}`, 512, 78);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 24px Plus Jakarta Sans, sans-serif';
  ctx.fillText(OFFICIAL_BRANDING.tagline, 512, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createDieFaceTexture(face: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 244);

  const pips: Record<number, [number, number][]> = {
    1: [[128, 128]],
    2: [[68, 68], [188, 188]],
    3: [[68, 68], [128, 128], [188, 188]],
    4: [[68, 68], [188, 68], [68, 188], [188, 188]],
    5: [[68, 68], [188, 68], [128, 128], [68, 188], [188, 188]],
    6: [[68, 64], [188, 64], [68, 128], [188, 128], [68, 192], [188, 192]],
  };

  ctx.fillStyle = face === 1 || face === 6 ? '#D97706' : '#0F172A';
  pips[face].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 23, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSculptedToken(color: PlayerColor, tokenId: number): THREE.Group {
  const meta = COLOR_META[color];
  const group = new THREE.Group();
  group.userData = { color, tokenId };

  // Sculpted Lathe body
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.36, 0),
    new THREE.Vector2(0.36, 0.1),
    new THREE.Vector2(0.26, 0.18),
    new THREE.Vector2(0.18, 0.54),
    new THREE.Vector2(0.28, 0.64),
    new THREE.Vector2(0.16, 0.74),
    new THREE.Vector2(0, 0.78),
  ];
  const latheGeo = new THREE.LatheGeometry(points, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: meta.hex,
    emissive: new THREE.Color(meta.hex),
    emissiveIntensity: 0.36,
    roughness: 0.24,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });
  const bodyMesh = new THREE.Mesh(latheGeo, bodyMat);
  bodyMesh.name = 'tokenBody';
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.userData = { color, tokenId };
  group.add(bodyMesh);

  // Metallic collar ring (varied roughness/metalness per 3D skill rule)
  const collarGeo = new THREE.TorusGeometry(0.21, 0.04, 12, 24);
  collarGeo.rotateX(Math.PI / 2);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.2,
    metalness: 0.85,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.y = 0.56;
  collar.userData = { color, tokenId };
  group.add(collar);

  // Top jewel finial
  const finialGeo = new THREE.SphereGeometry(0.13, 16, 12);
  const finialMat = new THREE.MeshStandardMaterial({
    color: meta.lightHex,
    emissive: new THREE.Color(meta.hex),
    emissiveIntensity: 0.3,
    roughness: 0.16,
    metalness: 0.15,
    envMapIntensity: 0.45,
  });
  const finial = new THREE.Mesh(finialGeo, finialMat);
  finial.position.y = 0.84;
  finial.castShadow = true;
  finial.userData = { color, tokenId };
  group.add(finial);

  // Selection highlight ring at base (hidden unless legal)
  const ringGeo = new THREE.RingGeometry(0.4, 0.52, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  ring.visible = false;
  ring.name = 'legalRing';
  group.add(ring);

  return group;
}

export const LudoBoard3D: React.FC<LudoBoard3DProps> = ({
  gameState,
  themeId,
  quality,
  canInteract,
  rolling,
  lightsEnabled = true,
  onSelectToken,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [webglFallback, setWebglFallback] = useState(false);

  const latestPropsRef = useRef({ gameState, canInteract, rolling, onSelectToken, cameraPreset });
  latestPropsRef.current = { gameState, canInteract, rolling, onSelectToken, cameraPreset };

  const sceneRefs = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    boardSurfaceMat?: THREE.MeshStandardMaterial;
    frameMat?: THREE.MeshStandardMaterial;
    trimMat?: THREE.MeshStandardMaterial;
    signMat?: THREE.MeshStandardMaterial;
    tokenGroups: Map<string, THREE.Group>;
    tokenTargets: Map<string, THREE.Vector3>;
    dieMesh?: THREE.Mesh;
    dieTargetEuler: THREE.Euler;
    presetTargetPos?: THREE.Vector3;
    presetActive: boolean;
    keyLight?: THREE.DirectionalLight;
    turnLight?: THREE.PointLight;
    turnLightTarget: THREE.Vector3;
    isSoftwareGl: boolean;
  }>({
    tokenGroups: new Map(),
    tokenTargets: new Map(),
    dieTargetEuler: new THREE.Euler(0, 0, 0),
    presetActive: false,
    turnLightTarget: new THREE.Vector3(-4.5, 4.2, -4.5),
    isSoftwareGl: false,
  });

  // Initialize Three.js WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      const preset = GRAPHICS_PRESETS[quality];
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && preset.antiAlias,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const theme = BOARD_THEMES[themeId];
    const preset = GRAPHICS_PRESETS[quality];
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, preset.resolutionScale));
    renderer.shadowMap.enabled = !isSoftwareGl && preset.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 500, container.clientHeight || 500);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.threeTableHex);
    scene.fog = new THREE.FogExp2(theme.threeTableHex, 0.014);

    // Studio environment map for PBR metallic trim & collars
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 500) / (container.clientHeight || 500),
      0.1,
      120
    );
    camera.position.set(0, 17, 13.5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.minPolarAngle = 0.15;
    controls.minDistance = 12;
    controls.maxDistance = 30;
    controls.enablePan = false;
    controls.addEventListener('start', () => {
      sceneRefs.current.presetActive = false;
    });

    // Crisp Neutral Studio Lighting Rig (keeps vivid colors true without warm/cool washout)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.92);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.position.set(9, 18, 11);
    keyLight.castShadow = !isSoftwareGl && preset.shadowsEnabled;
    const shadowSize = Math.min(preset.shadowMapSize || 1024, 2048);
    keyLight.shadow.mapSize.set(shadowSize, shadowSize);
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    // Dynamic Arena Accent Spotlight illuminating active player's quadrant
    const turnLight = new THREE.PointLight(COLOR_META.red.hex, lightsEnabled ? 9 : 0, 22, 1.4);
    turnLight.position.set(-4.5, 4.2, -4.5);
    scene.add(turnLight);

    // Table pedestal surface
    const tableGeo = new THREE.CylinderGeometry(24, 26, 0.8, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: theme.threeTableHex,
      roughness: 0.75,
      metalness: 0.1,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.75;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Board Wooden/Obsidian Plinth
    const frameGeo = new THREE.BoxGeometry(16.8, 0.65, 16.8);
    const frameMat = new THREE.MeshStandardMaterial({
      color: theme.threeFrameHex,
      roughness: 0.42,
      metalness: 0.25,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.35;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    scene.add(frameMesh);

    // Metallic Gold/Silver Bevel Trim
    const trimGeo = new THREE.BoxGeometry(17.15, 0.2, 17.15);
    const trimMat = new THREE.MeshStandardMaterial({
      color: theme.threeTrimHex,
      roughness: 0.24,
      metalness: 0.85,
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = -0.42;
    scene.add(trimMesh);

    // Playable 15x15 Board Surface
    const safeTexSize = resolveSafeTextureSize(preset, renderer.capabilities.maxTextureSize);
    const boardTex = createProceduralBoardTexture(themeId, Math.min(safeTexSize, 4096));
    boardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const boardSurfaceGeo = new THREE.BoxGeometry(15, 0.08, 15);
    const boardSurfaceMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      emissiveMap: boardTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: lightsEnabled ? 0.34 : 0.18,
      roughness: 0.65,
      metalness: 0.0,
      envMapIntensity: 0.12,
    });
    const boardMesh = new THREE.Mesh(boardSurfaceGeo, boardSurfaceMat);
    boardMesh.position.y = 0;
    boardMesh.receiveShadow = true;
    scene.add(boardMesh);

    // Subtle L-Shaped Neon LED Strip Accent Rails around all 4 Colored Corners
    const neonRails: { pos: [number, number, number]; size: [number, number, number]; hex: string }[] = [
      // Red (Top-Left)
      { pos: [-7.66, 0.06, -4.5], size: [0.1, 0.08, 6.2], hex: COLOR_META.red.hex },
      { pos: [-4.5, 0.06, -7.66], size: [6.2, 0.08, 0.1], hex: COLOR_META.red.hex },
      // Green (Top-Right)
      { pos: [7.66, 0.06, -4.5], size: [0.1, 0.08, 6.2], hex: COLOR_META.green.hex },
      { pos: [4.5, 0.06, -7.66], size: [6.2, 0.08, 0.1], hex: COLOR_META.green.hex },
      // Yellow (Bottom-Right)
      { pos: [7.66, 0.06, 4.5], size: [0.1, 0.08, 6.2], hex: COLOR_META.yellow.hex },
      { pos: [4.5, 0.06, 7.66], size: [6.2, 0.08, 0.1], hex: COLOR_META.yellow.hex },
      // Blue (Bottom-Left)
      { pos: [-7.66, 0.06, 4.5], size: [0.1, 0.08, 6.2], hex: COLOR_META.blue.hex },
      { pos: [-4.5, 0.06, 7.66], size: [6.2, 0.08, 0.1], hex: COLOR_META.blue.hex },
    ];
    neonRails.forEach((rail) => {
      const rGeo = new THREE.BoxGeometry(...rail.size);
      const rMat = new THREE.MeshStandardMaterial({
        color: rail.hex,
        emissive: new THREE.Color(rail.hex),
        emissiveIntensity: lightsEnabled ? 1.15 : 0.16,
        roughness: 0.2,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.set(...rail.pos);
      rMesh.name = 'neonRail';
      scene.add(rMesh);
    });

    // Physical 3D AJ Studios Signboard Plaque mounted on front bezel
    const signTex = createSignboardTexture(themeId);
    signTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.3,
      metalness: 0.45,
    });
    const signGeo = new THREE.BoxGeometry(7.2, 1.05, 0.14);
    const signPlaque = new THREE.Mesh(signGeo, signMat);
    signPlaque.position.set(0, 0.2, 8.28);
    signPlaque.rotation.x = -0.45;
    signPlaque.castShadow = true;
    scene.add(signPlaque);

    // Realistic 3D Die on Center Dais
    const dieMaterials = [3, 4, 1, 6, 2, 5].map(
      (faceNum) =>
        new THREE.MeshStandardMaterial({
          map: createDieFaceTexture(faceNum),
          roughness: 0.22,
          metalness: 0.05,
        })
    );
    const dieGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const dieMesh = new THREE.Mesh(dieGeo, dieMaterials);
    dieMesh.position.set(0, 0.54, 0);
    dieMesh.castShadow = true;
    scene.add(dieMesh);

    // Build all 16 sculpted 3D tokens
    const tokenGroups = new Map<string, THREE.Group>();
    const tokenTargets = new Map<string, THREE.Vector3>();
    for (const player of gameState.players) {
      for (const token of player.tokens) {
        const key = `${player.color}-${token.id}`;
        const grp = buildSculptedToken(player.color, token.id);
        const [r, c] = getTokenBoardCoord(player.color, token.id, token.progress);
        const [wx, wz] = boardCoordToWorld(r, c);
        grp.position.set(wx, 0.05, wz);
        scene.add(grp);
        tokenGroups.set(key, grp);
        tokenTargets.set(key, new THREE.Vector3(wx, 0.05, wz));
      }
    }

    sceneRefs.current = {
      renderer,
      scene,
      camera,
      controls,
      boardSurfaceMat,
      frameMat,
      trimMat,
      signMat,
      tokenGroups,
      tokenTargets,
      dieMesh,
      dieTargetEuler: new THREE.Euler(0, 0, 0),
      presetActive: false,
      keyLight,
      turnLight,
      turnLightTarget: new THREE.Vector3(-4.5, 4.2, -4.5),
      isSoftwareGl,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting pointer tap/click for 3D token selection
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
      const latest = latestPropsRef.current;
      if (!latest.canInteract || latest.gameState.phase !== 'MOVE') return;

      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_mouse, camera);

      const activeColor = latest.gameState.players[latest.gameState.activeColorIndex].color;
      const legalIds = new Set(latest.gameState.legalTokenIds);
      const candidates: THREE.Object3D[] = [];
      legalIds.forEach((id) => {
        const grp = tokenGroups.get(`${activeColor}-${id}`);
        if (grp) candidates.push(grp);
      });

      const hits = _raycaster.intersectObjects(candidates, true);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (typeof hitData.tokenId === 'number' && legalIds.has(hitData.tokenId)) {
          latest.onSelectToken(hitData.tokenId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize observer
    const onResize = () => {
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop with software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const { rolling: isRolling } = latestPropsRef.current;

      // Smooth camera preset transition
      if (sceneRefs.current.presetActive && sceneRefs.current.presetTargetPos) {
        camera.position.lerp(sceneRefs.current.presetTargetPos, 1 - Math.exp(-6 * dt));
        if (camera.position.distanceTo(sceneRefs.current.presetTargetPos) < 0.08) {
          sceneRefs.current.presetActive = false;
        }
      }
      controls.update();

      // Smooth arena spotlight glide
      if (sceneRefs.current.turnLight) {
        sceneRefs.current.turnLight.position.lerp(sceneRefs.current.turnLightTarget, 1 - Math.exp(-5 * dt));
      }

      // Smooth token hopping & legal ring pulse
      tokenGroups.forEach((grp, key) => {
        const target = tokenTargets.get(key);
        if (target) {
          const dist = Math.hypot(target.x - grp.position.x, target.z - grp.position.z);
          grp.position.x = THREE.MathUtils.damp(grp.position.x, target.x, 12, dt);
          grp.position.z = THREE.MathUtils.damp(grp.position.z, target.z, 12, dt);
          // Parabolic hop arc when moving
          const hopHeight = dist > 0.06 ? Math.min(0.9, dist * 0.45) : 0;
          grp.position.y = THREE.MathUtils.damp(grp.position.y, 0.05 + hopHeight, 14, dt);
        }
        const ring = grp.getObjectByName('legalRing');
        if (ring && ring.visible) {
          const s = 1 + Math.sin(elapsed * 6) * 0.12;
          ring.scale.set(s, s, 1);
        }
      });

      // 3D Die tumble or settle
      if (dieMesh) {
        if (isRolling) {
          dieMesh.rotation.x += dt * 14;
          dieMesh.rotation.y += dt * 18;
          dieMesh.position.y = 0.72 + Math.abs(Math.sin(elapsed * 16)) * 0.55;
        } else {
          const tE = sceneRefs.current.dieTargetEuler;
          dieMesh.rotation.x = THREE.MathUtils.damp(dieMesh.rotation.x, tE.x, 14, dt);
          dieMesh.rotation.y = THREE.MathUtils.damp(dieMesh.rotation.y, tE.y, 14, dt);
          dieMesh.rotation.z = THREE.MathUtils.damp(dieMesh.rotation.z, tE.z, 14, dt);
          dieMesh.position.y = THREE.MathUtils.damp(dieMesh.position.y, 0.54, 14, dt);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  // Update theme and quality textures dynamically without tearing down WebGL context
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs.renderer || !refs.scene) return;
    const theme = BOARD_THEMES[themeId];
    const preset = GRAPHICS_PRESETS[quality];

    refs.scene.background = new THREE.Color(theme.threeTableHex);
    refs.scene.fog = new THREE.FogExp2(theme.threeTableHex, 0.018);

    refs.renderer.setPixelRatio(
      refs.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, preset.resolutionScale)
    );
    refs.renderer.shadowMap.enabled = !refs.isSoftwareGl && preset.shadowsEnabled;
    if (refs.keyLight) {
      refs.keyLight.castShadow = !refs.isSoftwareGl && preset.shadowsEnabled;
    }

    if (refs.frameMat) refs.frameMat.color.setHex(theme.threeFrameHex);
    if (refs.trimMat) refs.trimMat.color.setHex(theme.threeTrimHex);

    if (refs.boardSurfaceMat) {
      const oldMap = refs.boardSurfaceMat.map;
      const safeSize = resolveSafeTextureSize(preset, refs.renderer.capabilities.maxTextureSize);
      const nextTex = createProceduralBoardTexture(themeId, Math.min(safeSize, 4096));
      nextTex.anisotropy = refs.renderer.capabilities.getMaxAnisotropy();
      refs.boardSurfaceMat.map = nextTex;
      refs.boardSurfaceMat.emissiveMap = nextTex;
      refs.boardSurfaceMat.needsUpdate = true;
      oldMap?.dispose();
    }

    if (refs.signMat) {
      const oldSign = refs.signMat.map;
      const nextSign = createSignboardTexture(themeId);
      nextSign.anisotropy = refs.renderer.capabilities.getMaxAnisotropy();
      refs.signMat.map = nextSign;
      refs.signMat.needsUpdate = true;
      oldSign?.dispose();
    }
  }, [themeId, quality]);

  // Sync token target positions, legal rings, and 3D die orientation
  useEffect(() => {
    const refs = sceneRefs.current;
    const activeColor = gameState.players[gameState.activeColorIndex].color;
    const legalSet = new Set(gameState.legalTokenIds);

    // Group tokens by coordinate for slight offset
    const coordGroups = new Map<string, { key: string; row: number; col: number }[]>();
    for (const player of gameState.players) {
      for (const token of player.tokens) {
        const [r, c] = getTokenBoardCoord(player.color, token.id, token.progress);
        const ck = `${r.toFixed(2)},${c.toFixed(2)}`;
        const arr = coordGroups.get(ck) ?? [];
        arr.push({ key: `${player.color}-${token.id}`, row: r, col: c });
        coordGroups.set(ck, arr);
      }
    }

    coordGroups.forEach((group) => {
      group.forEach((item, idx) => {
        let dx = 0;
        let dz = 0;
        if (group.length > 1) {
          const angle = (Math.PI * 2 * idx) / group.length;
          dx = Math.cos(angle) * 0.24;
          dz = Math.sin(angle) * 0.24;
        }
        const [wx, wz] = boardCoordToWorld(item.row, item.col);
        _targetVec.set(wx + dx, 0.05, wz + dz);
        const existing = refs.tokenTargets.get(item.key);
        if (existing) existing.copy(_targetVec);
        else refs.tokenTargets.set(item.key, _targetVec.clone());
      });
    });

    refs.tokenGroups.forEach((grp, key) => {
      const [colStr, idStr] = key.split('-');
      const isLegal =
        canInteract &&
        gameState.phase === 'MOVE' &&
        colStr === activeColor &&
        legalSet.has(Number(idStr));
      const ring = grp.getObjectByName('legalRing');
      if (ring) ring.visible = isLegal;
    });

    // Orient 3D die top face to match diceValue
    // Box faces order: [+X=3, -X=4, +Y=1, -Y=6, +Z=2, -Z=5]
    const val = gameState.diceValue ?? 1;
    const eulerMap: Record<number, [number, number, number]> = {
      1: [0, 0, 0],
      6: [Math.PI, 0, 0],
      2: [-Math.PI / 2, 0, 0],
      5: [Math.PI / 2, 0, 0],
      3: [0, 0, Math.PI / 2],
      4: [0, 0, -Math.PI / 2],
    };
    const [ex, ey, ez] = eulerMap[val] ?? [0, 0, 0];
    refs.dieTargetEuler.set(ex, ey, ez);

    // Update dynamic 3D arena turn spotlight & glowing trim
    const cornerWorld: Record<PlayerColor, [number, number]> = {
      red: [-4.5, -4.5],
      green: [4.5, -4.5],
      yellow: [4.5, 4.5],
      blue: [-4.5, 4.5],
    };
    const [tx, tz] = cornerWorld[activeColor];
    refs.turnLightTarget.set(tx, 4.2, tz);
    if (refs.turnLight) {
      refs.turnLight.color.set(COLOR_META[activeColor].hex);
      refs.turnLight.intensity = lightsEnabled ? 9 : 0;
    }
    if (refs.boardSurfaceMat) {
      refs.boardSurfaceMat.emissiveIntensity = lightsEnabled ? 0.34 : 0.18;
    }
    if (refs.trimMat) {
      refs.trimMat.emissive.set(lightsEnabled ? COLOR_META[activeColor].hex : 0x000000);
      refs.trimMat.emissiveIntensity = lightsEnabled ? 0.35 : 0;
    }
    refs.tokenGroups.forEach((grp) => {
      const body = grp.getObjectByName('tokenBody') as THREE.Mesh | undefined;
      if (body && body.material instanceof THREE.MeshStandardMaterial) {
        body.material.emissiveIntensity = lightsEnabled ? 0.38 : 0.18;
      }
    });
    refs.scene?.traverse((obj) => {
      if (obj.name === 'neonRail' && obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.emissiveIntensity = lightsEnabled ? 1.15 : 0.16;
      }
    });
  }, [gameState, canInteract, lightsEnabled]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const refs = sceneRefs.current;
    if (preset === 'isometric') refs.presetTargetPos = new THREE.Vector3(0, 17, 13.5);
    else if (preset === 'top') refs.presetTargetPos = new THREE.Vector3(0, 22, 0.5);
    else refs.presetTargetPos = new THREE.Vector3(0, 9.5, 16.5);
    refs.presetActive = true;
  };

  if (webglFallback) {
    return (
      <div className="w-full max-w-[540px] mx-auto aspect-square rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-display font-bold text-white text-lg">3D WebGL Unavailable</p>
        <p className="text-sm text-slate-400 mt-1">
          Your browser context paused WebGL. Switch to 2D HD mode above to continue playing seamlessly.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      <div
        ref={mountRef}
        className="w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/70 shadow-2xl touch-none"
      />
      {/* Compact Camera Angle Switcher */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {(['isometric', 'top', 'low'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyCameraPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
              cameraPreset === p
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {p === 'isometric' ? 'Isometric' : p === 'top' ? 'Overhead' : 'Tabletop'}
          </button>
        ))}
      </div>
    </div>
  );
};
