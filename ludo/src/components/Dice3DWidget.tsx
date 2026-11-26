import React, { useEffect, useState } from 'react';
import { COLOR_META, PlayerColor } from '../shared/ludoEngine';

interface Dice3DWidgetProps {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  activeColor: PlayerColor;
  onRoll: () => void;
}

// Target X/Y rotations so the corresponding face faces the viewer
const FACE_ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateX(0deg) rotateY(-90deg)',
  4: 'rotateX(0deg) rotateY(90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(180deg) rotateY(0deg)',
};

const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DieFace: React.FC<{ face: number; transform: string; accentHex: string }> = ({
  face,
  transform,
  accentHex,
}) => {
  const pips = PIP_LAYOUTS[face];
  return (
    <div
      className="absolute inset-0 rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-200 border border-slate-300/90 shadow-inner grid grid-cols-3 grid-rows-3 p-2.5 gap-1 backface-hidden"
      style={{ transform }}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const active = pips.includes(idx);
        return (
          <div key={idx} className="flex items-center justify-center">
            {active && (
              <span
                className="w-2.5 h-2.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                style={{
                  backgroundColor: face === 1 || face === 6 ? accentHex : '#0F172A',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Dice3DWidget: React.FC<Dice3DWidgetProps> = ({
  value,
  rolling,
  canRoll,
  activeColor,
  onRoll,
}) => {
  const [spinTransform, setSpinTransform] = useState(FACE_ROTATIONS[value ?? 6]);
  const accentHex = COLOR_META[activeColor].hex;

  useEffect(() => {
    if (rolling) {
      let frame = 0;
      const timer = setInterval(() => {
        frame += 1;
        const rx = 180 * frame + Math.floor(Math.random() * 140);
        const ry = 220 * frame + Math.floor(Math.random() * 140);
        setSpinTransform(`rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${frame * 45}deg)`);
      }, 85);
      return () => clearInterval(timer);
    }
    setSpinTransform(FACE_ROTATIONS[value ?? 1]);
  }, [rolling, value]);

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={!canRoll || rolling}
      aria-label={canRoll ? 'Roll 3D Dice' : 'Waiting for turn'}
      className={`group relative flex items-center justify-center w-20 h-20 rounded-2xl transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        canRoll && !rolling
          ? 'cursor-pointer active:scale-95 hover:scale-105'
          : 'cursor-default opacity-80'
      }`}
      style={{
        backgroundColor: canRoll ? `${accentHex}22` : 'rgba(30, 41, 59, 0.55)',
        border: `2px solid ${canRoll ? accentHex : 'rgba(148, 163, 184, 0.25)'}`,
        boxShadow: canRoll ? `0 8px 24px ${accentHex}38` : undefined,
      }}
    >
      <div className="dice-scene w-14 h-14 flex items-center justify-center">
        <div
          className={`dice-cube relative w-14 h-14 ${rolling ? 'rolling' : ''}`}
          style={{ transform: spinTransform }}
        >
          <DieFace face={1} transform="translateZ(28px)" accentHex={accentHex} />
          <DieFace face={6} transform="rotateY(180deg) translateZ(28px)" accentHex={accentHex} />
          <DieFace face={3} transform="rotateY(90deg) translateZ(28px)" accentHex={accentHex} />
          <DieFace face={4} transform="rotateY(-90deg) translateZ(28px)" accentHex={accentHex} />
          <DieFace face={2} transform="rotateX(90deg) translateZ(28px)" accentHex={accentHex} />
          <DieFace face={5} transform="rotateX(-90deg) translateZ(28px)" accentHex={accentHex} />
        </div>
      </div>
    </button>
  );
};
