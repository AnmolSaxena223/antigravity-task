import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, History, Trophy, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface MatchHistoryProps {
  onNavigate: (page: string) => void;
}

interface MatchItem {
  _id: string;
  roomId: string;
  entryFee: number;
  prizePool: number;
  winner?: string;
  status: string;
  createdAt: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ onNavigate }) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatchHistory = async () => {
    setLoading(true);
    // Query platform games (we can simulate or query their specific transactions)
    const response = await apiRequest('/wallet/data');
    setLoading(false);
    
    if (response.success && response.transactions) {
      // Find game fee & win transactions to display as game sessions
      const gameTxs = response.transactions.filter((tx: any) => 
        ['game_fee', 'game_win'].includes(tx.type)
      );

      // Convert transactions to friendly MatchItems
      const items: MatchItem[] = gameTxs.map((tx: any) => ({
        _id: tx._id,
        roomId: tx.paymentId || 'ROOM' + tx._id.slice(-4).toUpperCase(),
        entryFee: tx.type === 'game_fee' ? tx.amount : tx.amount / 1.8,
        prizePool: tx.type === 'game_win' ? tx.amount : tx.amount * 1.8,
        winner: tx.type === 'game_win' ? 'Me' : 'Opponent',
        status: tx.status === 'completed' ? 'completed' : 'cancelled',
        createdAt: tx.createdAt
      }));

      setMatches(items);
    }
  };

  useEffect(() => {
    fetchMatchHistory();
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto relative">
      <div className="absolute top-[10%] left-[20%] w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
          className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-extrabold tracking-wide dark:text-white">
          Gameplay Logs
        </h2>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <span className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
          </div>
        ) : matches.length === 0 ? (
          <GlassCard className="p-8 text-center bg-white/5 dark:bg-black/10 border-white/10">
            <History className="mx-auto w-12 h-12 text-slate-650 mb-3 opacity-30 animate-pulse" />
            <span className="text-sm text-slate-800 dark:text-slate-55px font-bold block">
              No recent matches logged. Join the Arena to start.
            </span>
          </GlassCard>
        ) : (
          matches.map((match) => {
            const isWon = match.winner === 'Me';

            return (
              <GlassCard key={match._id} className="p-4 bg-white/5 dark:bg-black/20 border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-white/10 dark:bg-black/25 ${isWon ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isWon ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold block dark:text-slate-200">
                      {isWon ? 'Victory Stake' : 'Defeat Match'}
                    </span>
                    <span className="text-[10px] text-slate-800 dark:text-slate-500 font-bold block flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(match.createdAt).toLocaleString()} | ID: {match.roomId}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-base font-extrabold block ${isWon ? 'text-emerald-500' : 'text-slate-500'}`}>
                    {isWon ? `+₹${match.prizePool.toFixed(1)}` : `-₹${match.entryFee.toFixed(1)}`}
                  </span>
                  <span className="text-[9px] text-slate-800 dark:text-slate-400 font-bold">
                    Entry stake: ₹{match.entryFee}
                  </span>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

    </div>
  );
};

export default MatchHistory;
