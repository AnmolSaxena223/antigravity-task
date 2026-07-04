import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logoutSuccess, updateProfileSuccess } from '../store/authSlice';
import { clearGameSession } from '../store/gameSlice';
import { apiRequest } from '../services/api';
import socketClient from '../services/socket';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import FriendsPanel from '../components/FriendsPanel';
import audioSynth from '../utils/audio';
import {
  Trophy,
  Wallet,
  Play,
  PlusCircle,
  Users,
  History,
  Settings,
  HelpCircle,
  Share2,
  User as UserIcon,
  LogOut,
  Sparkles,
  ShieldCheck,
  Copy
} from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string, data?: any) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // Friends Panel Visibility
  const [showFriends, setShowFriends] = useState(false);

  // Initialize socket connection & fetch fresh profile on Home load
  useEffect(() => {
    if (token) {
      socketClient.connect(token);
      
      const fetchProfile = async () => {
        const response = await apiRequest('/auth/profile');
        if (response.success && response.user) {
          dispatch(updateProfileSuccess(response.user));
        }
      };
      
      fetchProfile();
    }
  }, [token, dispatch]);

  const handleLogout = async () => {
    audioSynth.playClick();
    await apiRequest('/auth/logout', { method: 'POST' });
    socketClient.disconnect();
    dispatch(clearGameSession());
    dispatch(logoutSuccess());
    onNavigate('login');
  };

  const handleQuickMatch = () => {
    audioSynth.playClick();
    onNavigate('create-room', { mode: 'quick' });
  };

  const handleCreateRoom = () => {
    audioSynth.playClick();
    onNavigate('create-room', { mode: 'private' });
  };

  const handleJoinRoom = () => {
    audioSynth.playClick();
    onNavigate('join-room');
  };

  if (!user) return null;

  // Combined balance representation
  const combinedBalance = user.balance.deposit + user.balance.win + user.balance.bonus;

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-20 relative max-w-4xl mx-auto flex flex-col justify-between">
      
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header Block */}
      <header className="flex items-center justify-between gap-4 mb-6">
        {/* User Card */}
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('profile'); }}
          className="flex items-center gap-3 text-left focus:outline-none hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 border border-white/20 shadow-md">
            {/* Visual avatar using generic character */}
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[14px] flex items-center justify-center font-extrabold text-white text-lg">
              {user.avatar.replace('avatar_', '')}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wide dark:text-white truncate max-w-[140px]">
              {user.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                ID: {user.friendId || 'FR-000000'}
              </span>
              {user.friendId && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    audioSynth.playClick();
                    navigator.clipboard.writeText(user.friendId);
                    alert('Friend ID copied to clipboard!');
                  }}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Copy Friend ID"
                >
                  <Copy size={9} />
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Global togglers */}
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Wallet balance panel */}
      <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-lg relative overflow-hidden mb-6">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] tracking-widest text-slate-800 dark:text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Wallet size={12} className="text-indigo-500" />
              TOTAL AVAILABLE BALANCE
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{combinedBalance.toFixed(2)}
              </span>
              <span className="text-xs text-slate-800 dark:text-slate-400 font-bold">INR</span>
            </div>
            {/* Wallet breakdowns */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-400">
              <span>Dep: <b className="text-slate-900 dark:text-white">₹{user.balance.deposit}</b></span>
              <span>Win: <b className="text-emerald-600 dark:text-emerald-400">₹{user.balance.win}</b></span>
              <span>Bonus: <b className="text-indigo-600 dark:text-indigo-400">₹{user.balance.bonus}</b></span>
            </div>
          </div>
          
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('wallet'); }}
            className="glass-btn glass-btn-primary px-5 py-3 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Wallet size={16} />
            Manage Funds
          </button>
        </div>
      </GlassCard>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Matchmaking */}
        <button
          onClick={handleQuickMatch}
          className="relative h-28 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-750 hover:from-indigo-500 hover:to-violet-650 text-white font-extrabold shadow-lg shadow-indigo-600/25 border border-white/10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95"
        >
          <span className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-125 transition-transform duration-500">
            <Play size={100} />
          </span>
          <div className="p-2.5 rounded-full bg-white/15 backdrop-blur-md">
            <Play size={24} className="fill-current text-white" />
          </div>
          <span className="text-xs tracking-wider uppercase">🎮 Quick Play</span>
        </button>

        {/* Create Private Room */}
        <button
          onClick={handleCreateRoom}
          className="relative h-28 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-650 text-white font-extrabold shadow-lg shadow-emerald-600/25 border border-white/10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95"
        >
          <span className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-125 transition-transform duration-500">
            <PlusCircle size={100} />
          </span>
          <div className="p-2.5 rounded-full bg-white/15 backdrop-blur-md">
            <PlusCircle size={24} />
          </div>
          <span className="text-xs tracking-wider uppercase">➕ Host Private Match</span>
        </button>

        {/* Friends Network */}
        <button
          onClick={() => { audioSynth.playClick(); setShowFriends(true); }}
          className="relative h-28 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-700 hover:from-fuchsia-500 hover:to-pink-605 text-white font-extrabold shadow-lg shadow-fuchsia-600/25 border border-white/10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95"
        >
          <span className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-125 transition-transform duration-500">
            <Users size={100} />
          </span>
          <div className="p-2.5 rounded-full bg-white/15 backdrop-blur-md">
            <Users size={24} />
          </div>
          <span className="text-xs tracking-wider uppercase">👥 Friends</span>
        </button>
      </div>

      {/* Auxiliary Features Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        
        {/* Enter Code */}
        <button
          onClick={handleJoinRoom}
          className="glass-card glass-card-hover p-4 flex flex-col items-center justify-center gap-2 text-center text-slate-800 dark:text-slate-200"
        >
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <PlusCircle size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">🔑 Join Code</span>
        </button>

        {/* Match History */}
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('match-history'); }}
          className="glass-card glass-card-hover p-4 flex flex-col items-center justify-center gap-2 text-center text-slate-800 dark:text-slate-200"
        >
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <History size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">📜 Match History</span>
        </button>

        {/* Leaderboard */}
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('leaderboard'); }}
          className="glass-card glass-card-hover p-4 flex flex-col items-center justify-center gap-2 text-center text-slate-800 dark:text-slate-200"
        >
          <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <Trophy size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">🏆 Leaderboard</span>
        </button>

        {/* Referral */}
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('referral'); }}
          className="glass-card glass-card-hover p-4 flex flex-col items-center justify-center gap-2 text-center text-slate-800 dark:text-slate-200"
        >
          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500 dark:text-pink-400">
            <Share2 size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">🎁 Referrals</span>
        </button>

      </div>

      {/* Support & Admin link panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-6 border-t border-slate-500/10">
        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-400">
          <button onClick={() => { audioSynth.playClick(); onNavigate('settings'); }} className="hover:text-indigo-500 flex items-center gap-1">
            <Settings size={14} /> Settings
          </button>
          <span>•</span>
          <button onClick={() => { audioSynth.playClick(); onNavigate('support'); }} className="hover:text-indigo-500 flex items-center gap-1">
            <HelpCircle size={14} /> Help Support
          </button>
          <span>•</span>
          <button onClick={() => { audioSynth.playClick(); onNavigate('privacy-policy'); }} className="hover:text-indigo-500">
            Privacy Policy
          </button>
          <span>•</span>
          <button onClick={() => { audioSynth.playClick(); onNavigate('terms-conditions'); }} className="hover:text-indigo-500">
            Terms
          </button>
        </div>

        {/* Quick entry if admin */}
        {user.role === 'admin' && (
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('admin-panel'); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-extrabold hover:bg-indigo-500/25 transition-all duration-300"
          >
            <ShieldCheck size={14} />
            Admin Dashboard
          </button>
        )}
      </div>

      {/* Friends Network Panel Drawer */}
      {showFriends && (
        <FriendsPanel 
          onClose={() => setShowFriends(false)} 
          onNavigate={onNavigate} 
        />
      )}

    </div>
  );
};

export default Home;
