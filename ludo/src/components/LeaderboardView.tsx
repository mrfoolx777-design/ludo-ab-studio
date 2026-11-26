import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface LeaderboardEntry {
  playerKey: string;
  name: string;
  wins: number;
  matches: number;
  captures: number;
  rating: number;
}

interface LeaderboardViewProps {
  open: boolean;
  onClose: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ open, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Failed to fetch standings');
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setError('Unable to reach online standings right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadData();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#131A27] border border-slate-700/80 p-5 sm:p-6 shadow-2xl max-h-[88dvh] flex flex-col">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 id="leaderboard-title" className="font-display text-xl font-bold text-white">
                Global Leaderboard
              </h2>
              <p className="text-xs text-slate-400">Online verified standings</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                void loadData();
              }}
              aria-label="Refresh Leaderboard"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Leaderboard"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {error ? (
            <div className="p-6 text-center text-sm text-rose-300">{error}</div>
          ) : loading && entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading standings…</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No completed online matches yet. Play an online match to claim the #1 rank!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 pr-2 font-medium">Rank</th>
                  <th className="py-2.5 px-2 font-medium">Player</th>
                  <th className="py-2.5 px-2 font-medium text-right">Wins</th>
                  <th className="py-2.5 px-2 font-medium text-right">Captures</th>
                  <th className="py-2.5 pl-2 font-medium text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {entries.map((entry, idx) => (
                  <tr key={entry.playerKey} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-2 font-mono-nums font-bold text-amber-400">#{idx + 1}</td>
                    <td className="py-3 px-2 font-semibold text-white truncate max-w-[160px]">
                      {entry.name}
                    </td>
                    <td className="py-3 px-2 text-right font-mono-nums text-slate-300">
                      {entry.wins}/{entry.matches}
                    </td>
                    <td className="py-3 px-2 text-right font-mono-nums text-slate-300">
                      {entry.captures}
                    </td>
                    <td className="py-3 pl-2 text-right font-mono-nums font-bold text-emerald-400">
                      {entry.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
