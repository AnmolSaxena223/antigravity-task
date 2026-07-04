import React from 'react';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardProps {
  onNavigate: (page: string) => void;
}

interface LeaderboardItem {
  rank: number;
  name: string;
  avatar: string;
  wins: number;
  prizeMoney: number;
}

const MOCK_LEADERS: LeaderboardItem[] = [
  { rank: 1, name: 'Ludo_Champ_99', avatar: 'avatar_5', wins: 245, prizeMoney: 24500 },
  { rank: 2, name: 'Ludo_Slayer', avatar: 'avatar_3', wins: 198, prizeMoney: 18400 },
  { rank: 3, name: 'KingOfDice', avatar: 'avatar_1', wins: 154, prizeMoney: 12200 },
  { rank: 4, name: 'AntigravityLudo', avatar: 'avatar_2', wins: 132, prizeMoney: 9800 },
  { rank: 5, name: 'LuckySixer', avatar: 'avatar_4', wins: 110, prizeMoney: 7600 },
  { rank: 6, name: 'SafeTokenPlayer', avatar: 'avatar_6', wins: 95, prizeMoney: 6200 },
  { rank: 7, name: 'NoMercyLudo', avatar: 'avatar_2', wins: 88, prizeMoney: 5400 }
];

const Leaderboard: React.FC<LeaderboardProps> = ({ onNavigate }) => {
  const top3 = MOCK_LEADERS.slice(0, 3);
  const remaining = MOCK_LEADERS.slice(3);

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 2: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
      case 3: return 'text-amber-600 bg-amber-600/10 border-amber-600/30';
      default: return 'text-slate-700 bg-slate-500/10 border-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto relative">
      <div className="absolute top-[10%] left-[25%] w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
          className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-extrabold tracking-wide dark:text-white">
          Ranking Arena
        </h2>
      </div>

      {/* Top 3 Visual Podiums */}
      <div className="flex justify-center items-end gap-3 mb-8 pt-6 max-w-sm mx-auto">
        {/* 2nd place (Left) */}
        {top3[1] && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-slate-400 flex items-center justify-center font-bold text-white relative shadow">
              {top3[1].avatar.replace('avatar_', '')}
              <Medal className="absolute -top-3.5 text-slate-300 w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-bold truncate max-w-[80px] mt-2 block dark:text-slate-300">{top3[1].name}</span>
            <span className="text-[10px] text-slate-500 font-extrabold block">{top3[1].wins} Wins</span>
            <div className="w-full h-20 bg-white/10 dark:bg-black/20 border border-white/15 dark:border-white/5 rounded-t-xl mt-3 flex items-center justify-center text-sm font-black text-slate-400 shadow-md">
              Rank 2
            </div>
          </div>
        )}

        {/* 1st place (Center) */}
        {top3[0] && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 p-0.5 border border-white/20 relative shadow-lg scale-110">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold text-white text-lg">
                {top3[0].avatar.replace('avatar_', '')}
              </div>
              <Crown className="absolute -top-5.5 text-yellow-500 w-6 h-6 fill-current animate-bounce" />
            </div>
            <span className="text-xs font-extrabold truncate max-w-[90px] mt-4 block text-yellow-500">{top3[0].name}</span>
            <span className="text-[10px] text-slate-500 font-extrabold block">{top3[0].wins} Wins</span>
            <div className="w-full h-24 bg-gradient-to-t from-indigo-950/20 to-white/15 dark:to-white/10 border border-indigo-500/20 rounded-t-xl mt-3 flex items-center justify-center text-base font-black text-yellow-500 shadow-lg">
              Rank 1
            </div>
          </div>
        )}

        {/* 3rd place (Right) */}
        {top3[2] && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-white relative shadow">
              {top3[2].avatar.replace('avatar_', '')}
              <Medal className="absolute -top-3.5 text-amber-600 w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-bold truncate max-w-[80px] mt-2 block dark:text-slate-300">{top3[2].name}</span>
            <span className="text-[10px] text-slate-500 font-extrabold block">{top3[2].wins} Wins</span>
            <div className="w-full h-16 bg-white/10 dark:bg-black/20 border border-white/15 dark:border-white/5 rounded-t-xl mt-3 flex items-center justify-center text-sm font-black text-amber-600 shadow-md">
              Rank 3
            </div>
          </div>
        )}
      </div>

      {/* Ranks 4-10 Listings */}
      <div className="space-y-3">
        {remaining.map((item) => (
          <GlassCard key={item.rank} className="p-3.5 bg-white/5 dark:bg-black/20 border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-lg text-[11px] font-black border flex items-center justify-center ${getRankBadgeColor(item.rank)}`}>
                {item.rank}
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/10 dark:bg-black/25 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-xs">
                {item.avatar.replace('avatar_', '')}
              </div>
              <span className="text-xs sm:text-sm font-extrabold dark:text-slate-200 truncate max-w-[120px] sm:max-w-xs">
                {item.name}
              </span>
            </div>

            <div className="text-right flex items-center gap-4">
              <div>
                <span className="text-xs sm:text-sm font-extrabold block dark:text-slate-200">
                  {item.wins} Wins
                </span>
                <span className="text-[9px] text-slate-800 dark:text-slate-500 font-bold block">
                  Stake Prize Won: ₹{item.prizeMoney}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

    </div>
  );
};

export default Leaderboard;
