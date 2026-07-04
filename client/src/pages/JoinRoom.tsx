import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setGameError } from '../store/gameSlice';
import socketClient from '../services/socket';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, Users, ArrowRight, ShieldAlert } from 'lucide-react';

interface JoinRoomProps {
  onNavigate: (page: string) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { currentGame, error } = useSelector((state: RootState) => state.game);
  
  const [roomCode, setRoomCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // If game joins and moves to active status, redirect to board
  useEffect(() => {
    if (currentGame && currentGame.status === 'active') {
      onNavigate('game-room');
    }
  }, [currentGame, onNavigate]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setValidationError(null);
    dispatch(setGameError(''));

    const code = roomCode.trim().toUpperCase();
    if (!code) {
      return setValidationError('Room code cannot be empty.');
    }
    if (code.length < 4) {
      return setValidationError('Please enter a valid room code.');
    }

    // Emit socket join room event
    socketClient.emit('room:join', { roomId: code });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto flex flex-col justify-between">
      <div className="absolute top-[15%] right-[15%] w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

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
            Join Game Lounge
          </h2>
        </div>

        {/* Display Status Errors */}
        {(error || validationError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm animate-pulse-slow">
            <ShieldAlert size={20} className="shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl space-y-6">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
              <Users size={28} />
            </div>
            <h3 className="text-lg font-extrabold dark:text-white">Enter Friendly Match Code</h3>
            <p className="text-xs text-slate-800 dark:text-slate-400 mt-1">
              Ask your friend for the room code, and type it below
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-850 dark:text-slate-400 text-center uppercase tracking-wider">
                ROOM CODE KEY
              </label>
              <input
                type="text"
                placeholder="e.g. ROOMCODE / LUDO1234"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full glass-input text-center text-lg sm:text-xl font-extrabold tracking-widest text-slate-900 dark:text-white uppercase placeholder-slate-500 placeholder-normal"
                maxLength={10}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full glass-btn glass-btn-primary py-3.5 rounded-xl text-sm"
            >
              Join Room Match
              <ArrowRight size={16} />
            </button>
          </form>

        </GlassCard>
      </div>

    </div>
  );
};

export default JoinRoom;
