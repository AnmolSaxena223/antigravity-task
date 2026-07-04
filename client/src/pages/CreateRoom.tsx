import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { startMatchmaking, cancelMatchmaking, setGameError } from '../store/gameSlice';
import socketClient from '../services/socket';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, Play, Users, PlusCircle, Trophy, Copy, Check, ShieldAlert } from 'lucide-react';

interface CreateRoomProps {
  data: { mode: 'quick' | 'private' }; // Matchmaking mode
  onNavigate: (page: string, data?: any) => void;
}

const ENTRY_FEE_PRESETS = [0, 20, 50, 100, 200];

const CreateRoom: React.FC<CreateRoomProps> = ({ data, onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { currentGame, matchmaking, matchmakingFee, error } = useSelector((state: RootState) => state.game);

  const isPrivate = data?.mode === 'private';
  const [selectedFee, setSelectedFee] = useState(50);
  const [copied, setCopied] = useState(false);

  // If game session starts (moves to active status), transition to game board screen
  useEffect(() => {
    if (currentGame) {
      if (currentGame.status === 'active') {
        onNavigate('game-room');
      }
    }
  }, [currentGame, onNavigate]);

  const handleStartAction = () => {
    if (!user) return;
    audioSynth.playClick();
    dispatch(setGameError('')); // Clear old errors

    // Check if user has sufficient funds
    const totalBalance = user.balance.deposit + user.balance.win + user.balance.bonus;
    if (totalBalance < selectedFee) {
      dispatch(setGameError('Insufficient wallet balance for this entry fee.'));
      return;
    }

    if (isPrivate) {
      // Emit create room event
      socketClient.emit('room:create', { entryFee: selectedFee });
    } else {
      // Trigger random matchmaker search
      dispatch(startMatchmaking(selectedFee));
      socketClient.emit('matchmake:start', { entryFee: selectedFee });
    }
  };

  const handleCancelSearch = () => {
    audioSynth.playClick();
    socketClient.emit('matchmake:cancel');
    dispatch(cancelMatchmaking());
  };

  const copyRoomCode = () => {
    if (!currentGame?.roomId) return;
    audioSynth.playClick();
    navigator.clipboard.writeText(currentGame.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe fallback if user disconnects or wants to leave waiting lobby
  const handleLeaveLounge = () => {
    audioSynth.playClick();
    socketClient.emit('game:leave');
    // Clear game session and return home
    onNavigate('home');
    window.location.reload(); // Quick reset
  };

  // If host is in waiting room
  const inWaitingLounge = isPrivate && currentGame && currentGame.status === 'waiting';

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto relative flex flex-col justify-between">
      <div className="absolute top-[10%] left-[20%] w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
            className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all duration-300 active:scale-95 shadow"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold tracking-wide dark:text-white">
            {isPrivate ? 'Private Room Host' : 'Arena Matchmaker'}
          </h2>
        </div>

        {/* Display Error Message Alerts */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 flex items-center gap-3 text-sm animate-pulse-slow">
            <ShieldAlert size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MAIN PANEL */}
        {!inWaitingLounge ? (
          <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl space-y-6">
            
            {/* Mode headers */}
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-2">
                {isPrivate ? <PlusCircle size={28} /> : <Play size={28} />}
              </div>
              <h3 className="text-lg font-extrabold dark:text-white">
                {isPrivate ? 'Host Friendly Match' : 'Compete Online'}
              </h3>
              <p className="text-xs text-slate-800 dark:text-slate-400 mt-1">
                Select entry stake to join the game board
              </p>
            </div>

            {/* Entry Fee Picker */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 tracking-wider uppercase block text-center">
                CHOOSE ENTRY FEE STAKE (INR)
              </span>
              <div className="flex flex-wrap justify-center gap-2.5">
                {ENTRY_FEE_PRESETS.map((fee) => {
                  const isSelected = selectedFee === fee;
                  return (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => { audioSynth.playClick(); setSelectedFee(fee); }}
                      className={`px-4 py-3 rounded-xl font-extrabold text-sm border min-w-[70px] text-center transition-all duration-300
                        ${isSelected 
                          ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white border-indigo-400 scale-105 shadow-md shadow-indigo-500/20' 
                          : 'bg-white/10 dark:bg-black/20 text-slate-800 dark:text-slate-300 border-white/10 dark:border-white/5 hover:bg-white/15'
                        }
                      `}
                    >
                      {fee === 0 ? 'FREE' : `₹${fee}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform rules details */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs font-semibold text-slate-800 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Committed Entry Stake:</span>
                <span className="dark:text-white">₹{selectedFee}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                <span>Winning Prize Pool (1.8x):</span>
                <span>₹{(selectedFee * 2 * 0.9).toFixed(1)}</span>
              </div>
              <div className="text-[10px] text-slate-700 dark:text-slate-500 italic pt-1 border-t border-white/10 text-center leading-relaxed">
                * Realtime matchmaking charges 10% platform commission on completed game prize pools. Auto-kick rules apply to inactive players.
              </div>
            </div>

            <button
              onClick={handleStartAction}
              className="w-full glass-btn glass-btn-primary py-3.5 rounded-xl text-sm"
            >
              {isPrivate ? 'Create Private Room Code' : 'Find Opponent Match'}
            </button>

          </GlassCard>
        ) : (
          /* Host waiting room panel (Lobby) */
          <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl space-y-6">
            
            <div className="text-center space-y-2">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <h3 className="text-lg font-extrabold dark:text-white">Lobby Setup Lounge</h3>
              <p className="text-xs text-slate-850 dark:text-slate-45px">Share the code with a friend to join the match</p>
            </div>

            {/* Room Code Visual display */}
            <div className="p-4 rounded-2xl bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/15 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[9px] font-bold text-slate-800 dark:text-slate-400 block uppercase">ROOM CODE</span>
                <span className="text-2xl font-black tracking-wider text-slate-900 dark:text-white">
                  {currentGame.roomId}
                </span>
              </div>
              
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Players list inside lounge */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase tracking-wider">
                JOINED PLAYERS
              </span>
              
              {/* Player 1 - Host */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    {currentGame.players[0].avatar.replace('avatar_', '')}
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
                    {currentGame.players[0].name} (Host)
                  </span>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full uppercase">
                  Ready
                </span>
              </div>

              {/* Player 2 - Waiting slots */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-between text-slate-800 dark:text-slate-400">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg border border-dashed border-white/20 flex items-center justify-center font-bold text-xs">
                    ?
                  </div>
                  <span className="text-xs font-semibold animate-pulse">
                    Waiting for friend...
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeaveLounge}
              className="w-full glass-btn bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-xs"
            >
              Cancel Match Lounge
            </button>

          </GlassCard>
        )}
      </div>

      {/* Matchmaking Queue searching Overlay */}
      {matchmaking && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard className="max-w-sm w-full p-8 bg-slate-900 border-2 border-indigo-500 shadow-2xl text-center space-y-6 text-white relative">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />

            <div className="space-y-1.5">
              <h3 className="text-lg font-black tracking-wide text-white">SEARCHING ONLINE OPPONENT</h3>
              <p className="text-xs text-slate-400">Stake amount: ₹{matchmakingFee}. Searching suitable skills match...</p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5 animate-pulse-slow">
              <Trophy size={14} className="text-yellow-500" />
              Prize money: ₹{((matchmakingFee || 0) * 2 * 0.9).toFixed(1)} coins
            </div>

            <button
              onClick={handleCancelSearch}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider rounded-xl uppercase transition-all shadow-md active:scale-95"
            >
              Cancel Searching
            </button>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default CreateRoom;
