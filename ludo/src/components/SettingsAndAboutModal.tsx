import React, { useEffect, useState } from 'react';
import { BookOpen, Lightbulb, Palette, ShieldCheck, Volume2, VolumeX, X } from 'lucide-react';
import { OFFICIAL_BRANDING } from '../shared/branding';
import {
  BOARD_THEMES,
  BoardThemeId,
  ViewDimension,
} from '../shared/themes';
import { soundEngine } from '../utils/audio';
import { ABLogo } from './AJLogo';

interface SettingsAndAboutModalProps {
  open: boolean;
  initialTab?: 'themes' | 'rules' | 'about';
  themeId: BoardThemeId;
  setThemeId: (id: BoardThemeId) => void;
  viewDimension: ViewDimension;
  setViewDimension: (dim: ViewDimension) => void;
  lightsEnabled: boolean;
  onToggleLights: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
}

export const SettingsAndAboutModal: React.FC<SettingsAndAboutModalProps> = ({
  open,
  initialTab = 'themes',
  themeId,
  setThemeId,
  viewDimension,
  setViewDimension,
  lightsEnabled,
  onToggleLights,
  muted,
  onToggleMute,
  onClose,
}) => {
  const [tab, setTab] = useState<'themes' | 'rules' | 'about'>(initialTab);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-xl rounded-3xl bg-[#131A27] border border-slate-700/80 p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <h2 id="settings-modal-title" className="font-display text-xl font-bold text-white">
            Themes &amp; Studio Info
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {(
            [
              ['themes', 'Themes', Palette],
              ['rules', 'Rules', BookOpen],
              ['about', 'About', ShieldCheck],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab(id);
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap min-h-[40px] ${
                tab === id ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex-1 overflow-y-auto space-y-5 pr-1">
          {tab === 'themes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-white">Board View</div>
                  <div className="text-xs text-slate-400">Switch between 2D and 3D anytime</div>
                </div>
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewDimension('2d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                      viewDimension === '2d' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    2D HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDimension('3d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                      viewDimension === '3d' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    3D
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 gap-2">
                  <div className="text-xs font-semibold text-white">Neon Lights</div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onToggleLights();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 min-h-[38px]"
                  >
                    <Lightbulb className={`w-3.5 h-3.5 ${lightsEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{lightsEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 gap-2">
                  <div className="text-xs font-semibold text-white">Sound Effects</div>
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 min-h-[38px]"
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{muted ? 'Muted' : 'On'}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-300 mb-2">Board Themes</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
                    const t = BOARD_THEMES[id];
                    const selected = themeId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setThemeId(id);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-colors ${
                          selected
                            ? 'bg-amber-500/15 border-amber-400'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span
                            className="w-7 h-7 rounded-lg border shrink-0"
                            style={{ backgroundColor: t.boardFrame, borderColor: t.boardFrameTrim }}
                          />
                          <span
                            className="w-7 h-7 rounded-lg border shrink-0"
                            style={{ backgroundColor: t.trackLight, borderColor: t.trackBorder }}
                          />
                        </div>
                        <div className="font-display font-bold text-sm text-white">{t.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{t.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <h3 className="font-display font-bold text-white">Traditional AB Ludo Offline Rules</h3>
                <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                  <li>Pick your favorite color (Crimson, Emerald, Amber, or Cobalt) and command 4 tokens.</li>
                  <li>Roll a <strong className="text-amber-300">6</strong> to deploy a token onto your colored Start square.</li>
                  <li>Rolling a <strong className="text-amber-300">6</strong> grants an extra roll. Three consecutive 6s forfeit the third roll and pass the turn.</li>
                  <li>The 4 colored Start squares and 4 Star squares are <strong className="text-emerald-300">Safe Zones</strong> where tokens cannot be captured.</li>
                  <li>Landing on an opponent&rsquo;s token on a non-safe square captures it back to their yard and grants you a bonus roll.</li>
                  <li>Enter your private colored Home Stretch and roll the exact number to guide all 4 tokens into the center AB Goal to win!</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/35 flex flex-col items-center text-center">
                <ABLogo size="lg" showStudio={false} className="mb-3" />
                <h3 className="font-display text-2xl font-extrabold text-white">
                  {OFFICIAL_BRANDING.gameName}
                </h3>
                <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 mt-1">
                  {OFFICIAL_BRANDING.tagline}
                </p>
                <div className="w-full h-px bg-slate-800 my-4" />
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div>
                    Official Studio: <strong className="text-white">{OFFICIAL_BRANDING.studioName}</strong>
                  </div>
                  <div>
                    Lead Developer &amp; Creator:{' '}
                    <strong className="text-amber-300">{OFFICIAL_BRANDING.developerName}</strong>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-slate-400 leading-relaxed max-w-sm">
                  Permanent Developer Signature: All game architecture, visual branding, procedural 2D/3D arenas, and multiplayer systems belong exclusively to {OFFICIAL_BRANDING.studioName}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
